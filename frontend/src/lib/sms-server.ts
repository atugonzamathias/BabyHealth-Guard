import "server-only";
import { createHash } from "node:crypto";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { ApiAuthError } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  estimateSmsCost,
  MAX_BASE_MESSAGE_CHARACTERS,
  MAX_SMS_CHARACTERS,
  MAX_STAFF_SUFFIX_CHARACTERS,
  smsSegmentCount,
} from "@/lib/sms-metrics";

type SmsStatus = "accepted" | "failed";
const STAFF_ROLES = new Set([
  "doctor",
  "admin",
  "health_worker",
  "health worker",
  "nurse",
  "midwife",
]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function truncateText(value: string, maximum: number): string {
  return Array.from(value).slice(0, maximum).join("");
}

async function assignedStaffContact(
  profile: DocumentData,
): Promise<string> {
  const staffUid = text(profile.assignedStaffUid);
  let assignedStaff: DocumentData | undefined;

  if (/^[A-Za-z0-9_-]{1,128}$/.test(staffUid)) {
    const snapshot = await getAdminDb().doc(`users/${staffUid}`).get();
    const staffProfile = snapshot.data();
    if (
      snapshot.exists &&
      staffProfile?.disabled !== true &&
      STAFF_ROLES.has(text(staffProfile?.role).toLowerCase())
    ) {
      assignedStaff = staffProfile;
    }
  }

  const name = text(assignedStaff?.fullName) || text(profile.assignedStaffName);
  const phone = text(assignedStaff?.phone) || text(profile.assignedStaffPhone);
  if (!name || !phone) return "";

  const nameCharactersAvailable =
    MAX_STAFF_SUFFIX_CHARACTERS - phone.length - 2;
  const compactName = truncateText(name, Math.max(0, nameCharactersAvailable));
  const suffix = compactName
    ? `\n${compactName},${phone}`
    : `\n${phone}`;
  return truncateText(suffix, MAX_STAFF_SUFFIX_CHARACTERS);
}

export async function sendSmsToMother({
  motherUid,
  message,
  category,
  sentBy,
  consentConfirmed,
}: {
  motherUid: string;
  message: string;
  category: string;
  sentBy: string;
  consentConfirmed: boolean;
}): Promise<{ status: SmsStatus; providerMessageId?: string }> {
  const motherRef = getAdminDb().doc(`users/${motherUid}`);
  const mother = await motherRef.get();
  const profile = mother.data();
  if (!mother.exists || profile?.role !== "mother") {
    throw new ApiAuthError("Mother profile was not found.", 404);
  }
  if (!consentConfirmed) {
    throw new ApiAuthError("Confirm the mother's consent before sending an SMS.", 400);
  }

  const rawPhone =
    typeof profile.phone === "string"
      ? profile.phone.trim()
      : typeof profile.phoneNumber === "string"
        ? profile.phoneNumber.trim()
        : "";
  const phone = rawPhone.replace(/[ \t()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new ApiAuthError(
      "The mother's profile needs a valid international-format phone number.",
      422,
    );
  }

  const baseMessage = truncateText(message, MAX_BASE_MESSAGE_CHARACTERS);
  const finalMessage = truncateText(
    `${baseMessage}${await assignedStaffContact(profile)}`,
    MAX_SMS_CHARACTERS,
  );
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME?.trim();
  const db = getAdminDb();
  const logId = motherRef.collection("smsLogs").doc().id;
  const logEntry = {
    motherUid,
    facilityId: text(profile.facilityId),
    facilityName: text(profile.facilityName),
    recipient: phone,
    direction: "outbound",
    message: finalMessage,
    category,
    provider: "africas_talking",
    sentBy,
    providerMessageId: null,
    deliveryStatus: "pending",
    consentConfirmed: true,
    messageLength: Array.from(finalMessage).length,
    segmentCount: smsSegmentCount(finalMessage),
    consentRecordedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  };
  const nestedLogRef = motherRef.collection("smsLogs").doc(logId);
  const billingLogRef = db.collection("sms_logs").doc(logId);
  const writeLogs = async (
    status: "accepted" | "failed",
    extras: Record<string, unknown> = {},
  ) => {
    const entry = {
      ...logEntry,
      ...extras,
      status,
      cost: estimateSmsCost(finalMessage, status),
    };
    const batch = db.batch();
    batch.set(nestedLogRef, entry);
    batch.set(billingLogRef, entry);
    await batch.commit();
  };
  if (!apiKey || !username) {
    await writeLogs("failed", {
      error: "Africa's Talking is not configured on the server.",
    });
    throw new ApiAuthError("Africa's Talking is not configured on the server.", 503);
  }

  const body = new URLSearchParams({ username, to: phone, message: finalMessage });

  let response: Response;
  let result:
    | {
        SMSMessageData?: {
          Recipients?: Array<{
            statusCode?: number | string;
            messageId?: string;
            status?: string;
          }>;
        };
      }
    | null;
  try {
    response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    result = (await response.json().catch(() => null)) as typeof result;
  } catch (error) {
    await writeLogs("failed", {
      error: error instanceof Error ? error.message.slice(0, 200) : "SMS request failed",
    });
    throw error;
  }

  const recipient = result?.SMSMessageData?.Recipients?.[0];
  if (
    !response.ok ||
    !recipient ||
    (String(recipient.statusCode) !== "101" &&
      String(recipient.status).toLowerCase() !== "success")
  ) {
    await writeLogs("failed", {
      providerStatus: recipient?.status ?? `HTTP ${response.status}`,
      providerStatusCode: recipient?.statusCode ?? null,
      providerMessageId: recipient?.messageId ?? null,
      providerResponse: JSON.stringify(result).slice(0, 500),
    });
    return { status: "failed" };
  }

  await writeLogs("accepted", {
    providerStatus: recipient.status ?? null,
    providerStatusCode: recipient.statusCode ?? null,
    providerMessageId: recipient.messageId ?? null,
    deliveryStatus: "pending",
  });
  return { status: "accepted", providerMessageId: recipient.messageId };
}

export async function sendSmsToStaff({
  motherUid,
  staffUid,
  staffPhone,
  message,
  sessionId,
}: {
  motherUid: string;
  staffUid: string;
  staffPhone: string;
  message: string;
  sessionId: string;
}): Promise<"accepted" | "failed"> {
  const phoneDigits = staffPhone.trim().replace(/[^\d+]/g, "");
  const phone = phoneDigits.startsWith("+256")
    ? phoneDigits
    : phoneDigits.startsWith("256")
      ? `+${phoneDigits}`
      : phoneDigits.startsWith("0")
        ? `+256${phoneDigits.slice(1)}`
        : "";
  const validPhone = /^\+256\d{9}$/.test(phone);
  const finalMessage = truncateText(message, MAX_SMS_CHARACTERS);
  const logId = `ussd_${createHash("sha256")
    .update(`${motherUid}:${sessionId}:staff-sms`)
    .digest("hex")
    .slice(0, 40)}`;
  const db = getAdminDb();
  const motherRef = db.doc(`users/${motherUid}`);
  const motherSnapshot = await motherRef.get();
  const motherProfile = motherSnapshot.data() ?? {};
  const nestedLogRef = motherRef.collection("smsLogs").doc(logId);
  const billingLogRef = db.collection("sms_logs").doc(logId);
  const username = process.env.AFRICASTALKING_USERNAME?.trim();
  const apiKey = process.env.AFRICASTALKING_API_KEY;

  const writeLogs = async (
    status: SmsStatus,
    extras: Record<string, unknown> = {},
  ) => {
    const entry = {
      motherUid,
      facilityId: text(motherProfile.facilityId),
      facilityName: text(motherProfile.facilityName),
      recipient: validPhone ? phone : "",
      direction: "outbound",
      message: finalMessage,
      category: "ussd_danger_alert",
      provider: "africas_talking",
      sentBy: "ussd",
      staffUid,
      providerMessageId: null,
      deliveryStatus: "pending",
      messageLength: Array.from(finalMessage).length,
      segmentCount: smsSegmentCount(finalMessage),
      createdAt: FieldValue.serverTimestamp(),
      ...extras,
      status,
      cost: estimateSmsCost(finalMessage, status),
    };
    const batch = db.batch();
    batch.set(nestedLogRef, entry);
    batch.set(billingLogRef, entry);
    await batch.commit();
  };

  if (!validPhone || !username || !apiKey) {
    await writeLogs("failed", {
      error: !validPhone
        ? "Assigned staff phone is missing or invalid."
        : "Africa's Talking is not configured on the server.",
    });
    return "failed";
  }

  let response: Response;
  let result:
    | {
        SMSMessageData?: {
          Recipients?: Array<{
            statusCode?: number | string;
            messageId?: string;
            status?: string;
          }>;
        };
      }
    | null;
  try {
    response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey,
      },
      body: new URLSearchParams({ username, to: phone, message: finalMessage }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    result = (await response.json().catch(() => null)) as typeof result;
  } catch (error) {
    await writeLogs("failed", {
      error: error instanceof Error ? error.message.slice(0, 200) : "SMS request failed",
    });
    console.error("USSD urgent staff SMS request failed", error);
    return "failed";
  }

  const recipient = result?.SMSMessageData?.Recipients?.[0];
  if (
    !response.ok ||
    !recipient ||
    (String(recipient.statusCode) !== "101" &&
      String(recipient.status).toLowerCase() !== "success")
  ) {
    await writeLogs("failed", {
      providerStatus: recipient?.status ?? `HTTP ${response.status}`,
      providerStatusCode: recipient?.statusCode ?? null,
      providerMessageId: recipient?.messageId ?? null,
      providerResponse: JSON.stringify(result).slice(0, 500),
    });
    return "failed";
  }

  await writeLogs("accepted", {
    providerStatus: recipient.status ?? null,
    providerStatusCode: recipient.statusCode ?? null,
    providerMessageId: recipient.messageId ?? null,
    deliveryStatus: "pending",
  });
  return "accepted";
}
