import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { apiError, getMotherInStaffFacility, requireStaff } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const ACTIONS = new Set(["vitals", "kick", "iron", "danger"]);
const DANGER_SIGNS = new Set([
  "Bleeding",
  "Severe Headache",
  "Baby Not Moving",
  "High Fever",
  "Severe abdominal pain",
  "Reduced fetal movement",
]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function dayKey(value: string): string {
  return value;
}

function parseDay(value: unknown): Date | null {
  const input = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const date = new Date(`${input}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

export async function POST(request: Request) {
  try {
    const context = await requireStaff(request);
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload || Array.isArray(payload)) {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const motherUid = text(payload.motherUid);
    const action = text(payload.action).toLowerCase();
    const day = parseDay(payload.day);
    if (
      !/^[A-Za-z0-9_-]{1,128}$/.test(motherUid) ||
      !ACTIONS.has(action) ||
      !day
    ) {
      return Response.json({ error: "Mother, record type, and date are required." }, { status: 400 });
    }

    const mother = await getMotherInStaffFacility(motherUid, context);
    const db = getAdminDb();
    const profileRef = db.doc(`users/${motherUid}`);
    const vitalsRef = profileRef.collection("dailyVitals").doc(dayKey(text(payload.day)));
    const healthLogRef = profileRef.collection("healthLogs").doc();
    const baseLog = {
      recordedBy: context.uid,
      recordedByRole: context.role,
      facilityId: mother.facilityId,
      facilityName: mother.facilityName,
      source: "web_staff",
      createdAt: FieldValue.serverTimestamp(),
    };

    if (action === "vitals") {
      const systolic = payload.systolic == null || payload.systolic === "" ? null : integer(payload.systolic);
      const diastolic = payload.diastolic == null || payload.diastolic === "" ? null : integer(payload.diastolic);
      const kicks = integer(payload.kicks);
      if (
        (systolic !== null && (systolic < 50 || systolic > 250)) ||
        (diastolic !== null && (diastolic < 30 || diastolic > 150)) ||
        kicks === null ||
        kicks < 0 ||
        kicks > 200
      ) {
        return Response.json({ error: "Enter valid blood pressure and kick-count values." }, { status: 400 });
      }
      const batch = db.batch();
      batch.set(vitalsRef, {
        day: Timestamp.fromDate(day),
        systolic,
        diastolic,
        kicks,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: context.uid,
        facilityId: mother.facilityId,
      }, { merge: true });
      batch.set(healthLogRef, { ...baseLog, type: "vitals_recorded", systolic, diastolic, kicks });
      await batch.commit();
    } else if (action === "kick") {
      const amount = integer(payload.amount);
      if (amount === null || amount < 1 || amount > 50) {
        return Response.json({ error: "Kick count must be between 1 and 50." }, { status: 400 });
      }
      const snapshot = await vitalsRef.get();
      const current = integer(snapshot.data()?.kicks) ?? 0;
      const next = current + amount;
      if (next > 200) {
        return Response.json({ error: "The daily kick count cannot exceed 200." }, { status: 400 });
      }
      const batch = db.batch();
      batch.set(vitalsRef, {
        day: Timestamp.fromDate(day),
        kicks: next,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: context.uid,
        facilityId: mother.facilityId,
      }, { merge: true });
      batch.set(healthLogRef, { ...baseLog, type: "kick_logged", total: next, amount });
      await batch.commit();
    } else if (action === "iron") {
      const taken = payload.taken;
      if (typeof taken !== "boolean") {
        return Response.json({ error: "Choose whether iron and folic acid was taken." }, { status: 400 });
      }
      const batch = db.batch();
      batch.set(vitalsRef, {
        day: Timestamp.fromDate(day),
        ironTaken: taken,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: context.uid,
        facilityId: mother.facilityId,
      }, { merge: true });
      batch.set(healthLogRef, { ...baseLog, type: "iron_folic_updated", taken });
      await batch.commit();
    } else {
      const sign = text(payload.sign);
      const description = text(payload.description);
      if (!DANGER_SIGNS.has(sign) || !description || description.length > 500) {
        return Response.json({ error: "Choose a danger sign and provide a short description." }, { status: 400 });
      }
      await healthLogRef.set({
        ...baseLog,
        type: "danger_sign_reported",
        sign,
        description,
        severity: text(payload.severity).toLowerCase() || "urgent",
        status: "open",
        clinic: mother.facilityName,
      });
    }

    return Response.json({ recorded: true, action, motherUid });
  } catch (error) {
    return apiError(error);
  }
}
