import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendSmsToMother, sendSmsToStaff } from "@/lib/sms-server";

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
  "2": "Heavy vaginal bleeding",
  "3": "Severe abdominal pain",
  "4": "Reduced fetal movement",
  "5": "Fever or chills",
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

function strictFacility(profile: MotherProfile): {
  id: string;
  name: string;
} | null {
  const id = cleanText(profile.facilityId, 120);
  const name = cleanText(profile.facilityName, 120);
  return id && name ? { id, name } : null;
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
  const [, requestTypeNumber, appointmentTypeNumber, windowNumber] = selection.split("*");
  const requestType = requestTypeNumber === "1" ? "new" : "reschedule";
  const appointmentType =
    appointmentTypeNumber === "1"
      ? "ANTENATAL"
      : appointmentTypeNumber === "2"
        ? "DELIVERY"
        : appointmentTypeNumber === "3"
          ? "POSTNATAL"
          : "IMMUNIZATION";
  const ref = getAdminDb()
    .collection("ussd_requests")
    .doc(stableId(`${motherUid}:${sessionId}`, `request:${selection}`));
  await ref.create({
    motherId: motherUid,
    facilityId: cleanText(profile.facilityId),
    facilityName: cleanText(profile.facilityName),
    motherName: cleanText(profile.fullName, 120),
    phone: cleanText(profile.phone) || cleanText(profile.phoneNumber),
    midwifeId: cleanText(profile.assignedStaffUid),
    clinic: clinicFor(profile),
    requestType,
    appointmentType,
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
  symptomNumber: string,
  severity: "emergency" | "moderate" | "urgent",
) {
  const symptom = SYMPTOMS[symptomNumber];
  const alertSeverity = severity;
  const facility = strictFacility(profile);
  if (!facility) {
    console.error("USSD danger alert rejected: mother has no valid facilityId", {
      motherUid,
      sessionId,
    });
    return { notified: false, staffName: "your health worker", clinic: "your clinic" };
  }
  const db = getAdminDb();
  const reportId = stableId(`${motherUid}:${sessionId}`, `danger-report:${symptomNumber}:${alertSeverity}`);
  const reportRef = db.collection("dangerSignReports").doc(reportId);
  const alertRef = db.doc(`users/${motherUid}/healthLogs/${reportId}`);
  const motherName = cleanText(profile.fullName, 120) || "A mother";
  const motherPhone = normalizedPhone(
    cleanText(profile.phone) || cleanText(profile.phoneNumber),
  );
  if (!motherPhone) {
    console.error("USSD danger alert rejected: mother has no valid phone", { motherUid });
    return { notified: false, staffName: "your health worker", clinic: facility.name };
  }
  let isNew = true;
  try {
    await reportRef.create({
      motherId: motherUid,
      motherName,
      phone: motherPhone,
      symptom,
      urgency: "CRITICAL",
      facilityId: facility.id,
      facilityName: facility.name,
      assignedMidwifeId: cleanText(profile.assignedStaffUid),
      status: "PENDING_ACTION",
      source: "ussd",
      serviceCode,
      sessionId,
      createdAt: FieldValue.serverTimestamp(),
    });
    await alertRef.create({
      type: "danger_sign_reported",
      sign: symptom,
      description: `Danger sign reported by USSD: ${symptom} (${alertSeverity})`,
      severity: alertSeverity,
      urgency: "CRITICAL",
      source: "ussd",
      serviceCode,
      status: "PENDING_ACTION",
      motherId: motherUid,
      motherName,
      phone: motherPhone,
      facilityId: facility.id,
      facilityName: facility.name,
      assignedMidwifeId: cleanText(profile.assignedStaffUid),
      clinic: facility.name,
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

  if (!isNew) {
    const existing = (await reportRef.get()).data();
    return {
      notified: existing?.motherSmsStatus === "accepted" || existing?.staffSmsStatus === "accepted",
      staffName: cleanText(existing?.assignedMidwifeName) || "your health worker",
      clinic: cleanText(existing?.facilityName) || facility.name,
    };
  }

  const assignedUid = cleanText(profile.assignedStaffUid);
  const assigned = assignedUid ? await db.doc(`users/${assignedUid}`).get() : null;
  const assignedData = assigned?.data() ?? {};
  const staff = assigned?.exists && assignedData.disabled !== true &&
      cleanText(assignedData.facilityId) === facility.id
    ? [{ uid: assignedUid, name: cleanText(assignedData.fullName), phone: normalizedPhone(cleanText(assignedData.phone)) }]
    : [];
  const recipients = staff.length
    ? staff
    : (await db.collection("users")
        .where("role", "==", "midwife")
        .where("facilityId", "==", facility.id)
        .get()).docs
        .filter((document) => document.data().disabled !== true)
        .map((document) => ({
          uid: document.id,
          name: cleanText(document.data().fullName),
          phone: normalizedPhone(cleanText(document.data().phone)),
        }))
        .filter((recipient) => recipient.phone);
  let motherSmsStatus: "accepted" | "failed" = "failed";
  try {
    const motherSms = await sendSmsToMother({
      motherUid,
      message: `BabyHealthGuard: Emergency alert received at ${facility.name}. Stay calm; a midwife has been alerted and will call you shortly.`,
      category: "ussd_danger_confirmation",
      sentBy: "ussd",
      consentConfirmed: true,
    });
    motherSmsStatus = motherSms.status;
  } catch (error) {
    console.error("USSD danger mother SMS failed", error);
  }
  const staffResults = await Promise.all(recipients.map((recipient) =>
    sendSmsToStaff({
      motherUid,
      staffUid: recipient.uid,
      staffPhone: recipient.phone,
      sessionId: `${reportId}:${recipient.uid}`,
      message: `URGENT: ${motherName} (${motherPhone}) reported ${symptom} at ${facility.name} via USSD. Check BabyHealth-Guard dashboard now.`,
    }),
  ));
  const staffSmsStatus = staffResults.includes("accepted") ? "accepted" : "failed";
  const assignedRecipient = recipients.find((recipient) => recipient.uid === assignedUid);
  await reportRef.update({
    motherSmsStatus,
    staffSmsStatus,
    assignedMidwifeName: assignedRecipient?.name || null,
    notificationUpdatedAt: FieldValue.serverTimestamp(),
  });
  await alertRef.update({
    notificationStatus: staffSmsStatus,
    notificationUpdatedAt: FieldValue.serverTimestamp(),
  });
  return {
    notified: motherSmsStatus === "accepted" || staffSmsStatus === "accepted",
    staffName: assignedRecipient?.name || "your health worker",
    clinic: facility.name,
  };
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
      `Welcome to BabyHealth-Guard\n1. Next Appointment\n2. Request / Reschedule Visit\n3. Report Danger Sign\n4. Maternal & Baby Tips`,
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
    return response(
      "CON",
      "Select visit type:\n1. Antenatal\n2. Delivery\n3. Postnatal\n4. Immunization",
    );
  }
  if (/^2\*[12]\*[1234]$/.test(text)) {
    return response("CON", "Preferred day:\n1. Tomorrow\n2. In 3 Days\n3. Next Week");
  }
  if (/^2\*[12]\*[1234]\*[123]$/.test(text)) {
    await requestVisit(uid, profile, sessionId, serviceCode, text);
    return response(
      "END",
      `Request received! Your midwife at ${clinicFor(profile)} will confirm your visit by SMS.`,
    );
  }
  if (text === "3") {
    return response(
      "CON",
      "Select main symptom:\n1. Severe headache / Blurred vision\n2. Heavy vaginal bleeding\n3. Severe abdominal pain\n4. Reduced fetal movement\n5. Fever / Chills",
    );
  }
  const dangerSelection = /^3\*([1-5])$/.exec(text);
  if (dangerSelection && ["1", "2"].includes(dangerSelection[1])) {
    return response(
      "CON",
      "Is this bleeding/pain heavy/severe?\n1. Yes (Emergency)\n2. Moderate",
    );
  }
  const dangerSeveritySelection = /^3\*([12])\*([12])$/.exec(text);
  const directDangerSelection = /^3\*([345])$/.exec(text);
  if (dangerSeveritySelection || directDangerSelection) {
    const symptomNumber = dangerSeveritySelection?.[1] ?? directDangerSelection?.[1] ?? "";
    const severity = dangerSeveritySelection
      ? dangerSeveritySelection[2] === "1"
        ? "emergency"
        : "moderate"
      : "urgent";
    const alert = await recordDangerAlert(
      uid,
      profile,
      sessionId,
      serviceCode,
      symptomNumber,
      severity,
    );
    if (alert.notified) {
      return response(
        "END",
        "Alert sent to your clinic midwife. Please stay calm and keep your phone nearby for a callback.",
      );
    }
    return response(
      "END",
      "Alert recorded, but staff SMS failed. Please stay calm and keep your phone nearby for a callback.",
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
