import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { ApiAuthError } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

type SmsStatus = "accepted" | "failed";

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

  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME?.trim();
  if (!apiKey || !username) {
    throw new ApiAuthError("Africa's Talking is not configured on the server.", 503);
  }

  const logRef = motherRef.collection("smsLogs").doc();
  const logBase = {
    direction: "outbound",
    message,
    category,
    provider: "africas_talking",
    sentBy,
    consentConfirmed: true,
    consentRecordedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  };
  const body = new URLSearchParams({ username, to: phone, message });

  try {
    const response = await fetch("https://api.africastalking.com/version1/messaging", {
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
    const result = (await response.json().catch(() => null)) as
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
    const recipient = result?.SMSMessageData?.Recipients?.[0];
    if (
      !response.ok ||
      !recipient ||
      (String(recipient.statusCode) !== "101" &&
        String(recipient.status).toLowerCase() !== "success")
    ) {
      await logRef.set({
        ...logBase,
        status: "failed",
        providerStatus: recipient?.status ?? `HTTP ${response.status}`,
      });
      return { status: "failed" };
    }

    await logRef.set({
      ...logBase,
      status: "accepted",
      providerMessageId: recipient.messageId ?? null,
    });
    return { status: "accepted", providerMessageId: recipient.messageId };
  } catch (error) {
    await logRef.set({
      ...logBase,
      status: "failed",
      error: error instanceof Error ? error.message.slice(0, 200) : "SMS request failed",
    });
    throw error;
  }
}
