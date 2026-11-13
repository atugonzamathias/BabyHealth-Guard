import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendSmsToStaff } from "@/lib/sms-server";

export const runtime = "nodejs";

const CONTENT_TYPE = "text/plain; charset=utf-8";
const MAX_RESPONSE_LENGTH = 181;
const UNREGISTERED_MESSAGE =
  "Welcome to BabyHealth-Guard. Your phone number is not registered. Please visit your nearest health facility or ask your midwife to register you.";
const WINDOWS: Record<string, string> = {
  "1": "Tomorrow",
  "2": "In 3 Days",
  "3": "Next Week",
};
const SYMPTOMS: Record<string, string> = {
  "1": "Severe headache or blurred vision",
  "2": "Bleeding or fluid leak",
  "3": "High fever or baby not moving",
  "4": "Other urgent issue",
};
const STAFF_ROLES = new Set([
  "doctor",
  "admin",
  "health_worker",
  "health worker",
  "nurse",
  "midwife",
]);

type MotherProfile = Record<string, unknown>;

function cleanText(value: unknown, maxLength = 100): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function response(prefix: "CON" | "END", message: string): Response {
  const value = `${prefix} ${message}`.slice(0, MAX_RESPONSE_LENGTH);
  return new Response(value, {
    status: 200,
    headers: { "Content-Type": CONTENT_TYPE, "Cache-Control": "no-store" },
  });
}

function normalizedPhone(value: string): string {
  const digits = value.trim().replace(/[^\d]/g, "");
  if (/^256\d{9}$/.test(digits)) return `+${digits}`;
  if (/^0\d{9}$/.test(digits)) return `+256${digits.slice(1)}`;
  return "";
}

function phoneCandidates(phone: string): string[] {
  const local = phone.slice(4);
  return [
    phone,
    `+256 ${local}`,
    `+256 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`,
    `0${local}`,
    `0${local.slice(0, 3)} ${local.slice(3)}`,
    `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`,
  ];
}

function firstName(profile: MotherProfile): string {
  return cleanText(profile.fullName, 100).split(" ")[0]?.slice(0, 24) || "Mother";
}

function stableId(sessionId: string, action: string): string {
  return `ussd_${createHash("sha256")
    .update(`${sessionId}:${action}`)
    .digest("hex")
    .slice(0, 40)}`;
}

async function findMother(phone: string) {
  const db = getAdminDb();
  const candidates = phoneCandidates(phone);
  const [phoneMatches, phoneNumberMatches] = await Promise.all([
    db.collection("users").where("phone", "in", candidates).get(),
    db.collection("users").where("phoneNumber", "in", candidates).get(),
  ]);
  const matches = new Map(
    [...phoneMatches.docs, ...phoneNumberMatches.docs]
      .filter((document) => {
        const profile = document.data();
        return (
          cleanText(profile.role).toLowerCase() === "mother" &&
          (normalizedPhone(cleanText(profile.phone)) === phone ||
            normalizedPhone(cleanText(profile.phoneNumber)) === phone)
        );
      })
      .map((document) => [document.id, document]),
  );
  if (matches.size !== 1) return null;
  const [uid, snapshot] = [...matches.entries()][0];
  return { uid, profile: snapshot.data() as MotherProfile };
}

function clinicFor(profile: MotherProfile): string {
  return (
    cleanText(profile.assignedStaffFacilityName) ||
    cleanText(profile.facilityName) ||
    "your health facility"
  );
}

function dateLabel(date: Date): string {
  return date.toLocaleString("en-UG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  });
}

async function requestVisit(
  motherUid: string,
  profile: MotherProfile,
  sessionId: string,
  serviceCode: string,
  selection: string,
) {
  const [, requestTypeNumber, windowNumber] = selection.split("*");
  const requestType = requestTypeNumber === "1" ? "new" : "reschedule";
  const ref = getAdminDb()
    .collection("ussd_requests")
    .doc(stableId(`${motherUid}:${sessionId}`, `request:${selection}`));
  await ref.create({
    motherId: motherUid,
    motherName: cleanText(profile.fullName, 120),
    phone: cleanText(profile.phone) || cleanText(profile.phoneNumber),
    midwifeId: cleanText(profile.assignedStaffUid),
    clinic: clinicFor(profile),
    requestType,
    preferredWindow: WINDOWS[windowNumber],
    status: "pending",
    source: "ussd",
    serviceCode,
    sessionId,
    createdAt: FieldValue.serverTimestamp(),
  }).catch(async (error: unknown) => {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === 6 || error.code === "already-exists")
    ) {
      return;
    }
    throw error;
  });
}

async function assignedHealthWorker(profile: MotherProfile) {
  const db = getAdminDb();
  const staffUid = cleanText(profile.assignedStaffUid);
  let staffProfile: MotherProfile = {};
  if (/^[A-Za-z0-9_-]{1,128}$/.test(staffUid)) {
    const snapshot = await db.doc(`users/${staffUid}`).get();
    const data = snapshot.data() as MotherProfile | undefined;
    if (
      snapshot.exists &&
      data &&
      data?.disabled !== true &&
      STAFF_ROLES.has(cleanText(data?.role).toLowerCase())
    ) {
      staffProfile = data;
    }
  }
  return {
    staffUid,
    name:
      cleanText(staffProfile.fullName) ||
      cleanText(profile.assignedStaffName) ||
      cleanText(profile.midwifeName) ||
      "your health worker",
    phone:
      cleanText(staffProfile.phone) ||
      cleanText(profile.assignedStaffPhone) ||
      cleanText(profile.midwifePhone),
  };
}

async function recordDangerAlert(
  motherUid: string,
  profile: MotherProfile,
  sessionId: string,
  serviceCode: string,
  selection: string,
) {
  const symptom = SYMPTOMS[selection.slice(2)];
  const alertRef = getAdminDb()
    .doc(`users/${motherUid}/healthLogs/${stableId(sessionId, `danger:${selection}`)}`);
  let isNew = true;
  try {
    await alertRef.create({
      type: "danger_sign_reported",
      sign: symptom,
      description: `Urgent danger sign reported by USSD: ${symptom}`,
      severity: "urgent",
      source: "ussd",
      serviceCode,
      status: "open",
      midwifeId: cleanText(profile.assignedStaffUid),
      clinic: clinicFor(profile),
      createdAt: FieldValue.serverTimestamp(),
      notificationStatus: "pending",
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === 6 || error.code === "already-exists")
    ) {
      isNew = false;
    } else {
      throw error;
    }
  }

  const clinic = clinicFor(profile);
  if (!isNew) {
    const existing = (await alertRef.get()).data();
    return {
      notified: existing?.notificationStatus === "accepted",
      staffName: cleanText(existing?.staffName) || "your health worker",
      clinic: cleanText(existing?.clinic) || clinic,
    };
  }

  const staff = await assignedHealthWorker(profile);
  const motherName = cleanText(profile.fullName, 120) || "A mother";
  const motherPhone = cleanText(profile.phone) || cleanText(profile.phoneNumber);
  const smsStatus = await sendSmsToStaff({
    motherUid,
    staffUid: staff.staffUid,
    staffPhone: staff.phone,
    sessionId: stableId(sessionId, `danger:${selection}`),
    message: `URGENT BabyHealth Guard: ${motherName} (${motherPhone}) reports ${symptom}. Contact her and arrange urgent care at ${clinic}.`,
  });
  await alertRef.update({
    notificationStatus: smsStatus,
    staffName: staff.name,
    staffPhone: staff.phone,
    notificationUpdatedAt: FieldValue.serverTimestamp(),
  });
  return { notified: smsStatus === "accepted", staffName: staff.name, clinic };
}

function healthTip(profile: MotherProfile): string {
  if (cleanText(profile.maternalStatus).toLowerCase() === "baby") {
    return "Keep your baby warm and breastfeed often. Seek care for fever, poor feeding or difficult breathing.";
  }
  const stage = cleanText(profile.pregnancyStage).toLowerCase();
  if (stage.startsWith("7")) {
    return "Attend every antenatal visit, plan transport for birth, and seek care quickly for bleeding or severe headache.";
  }
  if (stage.startsWith("4")) {
    return "Attend antenatal visits and take iron and folic acid as advised. Seek care for bleeding or severe headache.";
  }
  return "Start antenatal care early, take iron and folic acid as advised, and seek care for any danger sign.";
}

async function handleUssd(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/x-www-form-urlencoded")) {
    return response("END", "Invalid request. Please dial the code again.");
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8192) {
    return response("END", "Invalid request. Please dial the code again.");
  }

  const body = await request.text();
  if (body.length > 8192) {
    return response("END", "Invalid request. Please dial the code again.");
  }
  const params = new URLSearchParams(body);
  const sessionId = cleanText(params.get("sessionId"), 256);
  const serviceCode = cleanText(params.get("serviceCode"), 40);
  const phone = normalizedPhone(params.get("phoneNumber") ?? "");
  const text = cleanText(params.get("text"), 100);
  if (!sessionId || !phone) {
    return response("END", "We could not verify this session. Please dial the code again.");
  }

  const mother = await findMother(phone);
  if (!mother) return response("END", UNREGISTERED_MESSAGE);
  const { uid, profile } = mother;

  if (text === "") {
    return response(
      "CON",
      `Welcome ${firstName(profile)} to BabyHealth-Guard:\n1. Next Appointment\n2. Request / Reschedule Visit\n3. Report Danger Signs (Urgent)\n4. Pregnancy / Baby Tip`,
    );
  }
  if (text === "1") {
    const appointments = await getAdminDb()
      .collection(`users/${uid}/appointments`)
      .where("status", "==", "scheduled")
      .get();
    const now = Date.now();
    const next = appointments.docs
      .map((document) => document.data())
      .filter(
        (appointment) =>
          appointment.scheduledAt instanceof Timestamp &&
          appointment.scheduledAt.toMillis() >= now,
      )
      .sort(
        (left, right) =>
          (left.scheduledAt as Timestamp).toMillis() -
          (right.scheduledAt as Timestamp).toMillis(),
      )[0];
    if (!next) {
      return response(
        "END",
        "You have no upcoming scheduled visits. Dial again and press 2 to request an appointment.",
      );
    }
    const midwifeName =
      cleanText(next.midwifeName) ||
      cleanText(profile.assignedStaffName) ||
      cleanText(profile.midwifeName) ||
      "your health worker";
    return response(
      "END",
      `Next Visit: ${cleanText(next.type, 50) || "Clinic"} on ${dateLabel(
        (next.scheduledAt as Timestamp).toDate(),
      )} at ${cleanText(next.clinic) || clinicFor(profile)} with ${midwifeName}.`,
    );
  }
  if (text === "2") {
    return response("CON", "Choose visit option:\n1. Request New Visit\n2. Reschedule Existing Visit");
  }
  if (text === "2*1" || text === "2*2") {
    return response("CON", "Preferred day:\n1. Tomorrow\n2. In 3 Days\n3. Next Week");
  }
  if (/^2\*[12]\*[123]$/.test(text)) {
    await requestVisit(uid, profile, sessionId, serviceCode, text);
    return response(
      "END",
      `Request received! Your midwife at ${clinicFor(profile)} will confirm your visit by SMS.`,
    );
  }
  if (text === "3") {
    return response(
      "CON",
      "Urgent Symptom Alert:\n1. Severe Headache / Blurred Vision\n2. Bleeding / Fluid Leak\n3. High Fever / Baby Not Moving\n4. Other Urgent Issue",
    );
  }
  if (/^3\*[1234]$/.test(text)) {
    const alert = await recordDangerAlert(uid, profile, sessionId, serviceCode, text);
    if (alert.notified) {
      return response(
        "END",
        `URGENT ALERT SENT to ${alert.staffName}. Please go to ${alert.clinic} immediately if symptoms worsen.`,
      );
    }
    return response(
      "END",
      "Urgent alert was recorded, but staff SMS failed. Please go to your health facility now.",
    );
  }
  if (text === "4") return response("END", healthTip(profile));
  return response("END", "Invalid selection. Please dial the code again to restart.");
}

export async function POST(request: Request): Promise<Response> {
  try {
    return await handleUssd(request);
  } catch (error) {
    console.error("USSD callback could not be completed", error);
    return response("END", "Service temporarily unavailable. Please try again later.");
  }
}
