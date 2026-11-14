import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { apiError, getMotherInStaffFacility, requireAdmin } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendSmsToMother } from "@/lib/sms-server";

export const runtime = "nodejs";

const TYPES = new Set(["ANTENATAL", "DELIVERY", "POSTNATAL", "IMMUNIZATION"]);
const REMINDERS = new Set([5, 30, 60, 720, 1440]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await requireAdmin(request);
    const { id } = await params;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
      return Response.json({ error: "USSD request ID is invalid." }, { status: 400 });
    }

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const scheduledAtText = text(payload?.scheduledAt);
    const type = text(payload?.type).toUpperCase();
    const clinic = text(payload?.clinic);
    const agenda = text(payload?.agenda);
    const reminderEnabled = payload?.reminderEnabled === true;
    const reminderMinutes =
      typeof payload?.reminderMinutes === "number" ? payload.reminderMinutes : NaN;
    const scheduledAtMillis = Date.parse(scheduledAtText);
    if (
      !payload ||
      !TYPES.has(type) ||
      !Number.isFinite(scheduledAtMillis) ||
      scheduledAtMillis <= Date.now() ||
      !clinic ||
      clinic.length > 120 ||
      agenda.length > 500 ||
      (reminderEnabled && !REMINDERS.has(reminderMinutes)) ||
      (reminderEnabled && reminderMinutes * 60_000 > scheduledAtMillis - Date.now())
    ) {
      return Response.json({ error: "Appointment details are invalid." }, { status: 400 });
    }

    const db = getAdminDb();
    const requestRef = db.doc(`ussd_requests/${id}`);
    const requestSnapshot = await requestRef.get();
    if (!requestSnapshot.exists) {
      return Response.json({ error: "USSD request was not found." }, { status: 404 });
    }
    const requestData = requestSnapshot.data() ?? {};
    if (text(requestData.status) !== "pending") {
      return Response.json({ error: "This USSD request has already been reviewed." }, { status: 409 });
    }
    const motherUid = text(requestData.motherId);
    if (!motherUid) {
      return Response.json({ error: "USSD request has no valid mother." }, { status: 422 });
    }
    const motherData = await getMotherInStaffFacility(motherUid, context);
    const facilityId = text(motherData.facilityId) || text(requestData.facilityId);
    const facilityName = text(motherData.facilityName) || text(requestData.facilityName);
    if (!facilityId || !facilityName) {
      return Response.json({ error: "Mother must have a valid facility before approval." }, { status: 422 });
    }
    const scheduledAt = Timestamp.fromMillis(scheduledAtMillis);
    const appointmentRef = db.doc(`users/${motherUid}/appointments/${db.collection("_").doc().id}`);
    const appointmentId = appointmentRef.id;
    const staffName = text((await db.doc(`users/${context.uid}`).get()).data()?.fullName) || "Clinic staff";
    const appointmentData = {
      type,
      scheduledAt,
      clinic,
      agenda,
      facilityId,
      facilityName,
      motherUid,
      motherName: text(motherData.fullName) || text(requestData.motherName),
      phone: text(motherData.phone) || text(motherData.phoneNumber) || text(requestData.phone),
      midwifeName: staffName,
      status: "scheduled",
      source: "ussd_conversion",
      reminderMinutes: reminderEnabled ? reminderMinutes : 0,
      reminderAt: reminderEnabled
        ? Timestamp.fromMillis(scheduledAtMillis - reminderMinutes * 60_000)
        : null,
      reminderStatus: reminderEnabled ? "pending" : "disabled",
      sendConfirmation: true,
      smsConsentConfirmed: true,
      confirmationStatus: "queued",
      createdBy: context.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(requestRef);
      if (!current.exists || text(current.data()?.status) !== "pending") {
        throw new Error("already-reviewed");
      }
      transaction.create(appointmentRef, appointmentData);
      transaction.update(requestRef, {
        status: "reviewed",
        reviewedBy: context.uid,
        reviewedAt: FieldValue.serverTimestamp(),
        appointmentId,
      });
    }).catch((error: unknown) => {
      if (error instanceof Error && error.message === "already-reviewed") {
        throw new Response(JSON.stringify({ error: "This USSD request has already been reviewed." }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw error;
    });

    const dateText = scheduledAt.toDate().toLocaleString("en-UG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Kampala",
    });
    let confirmationStatus: "accepted" | "failed" = "failed";
    try {
      const result = await sendSmsToMother({
        motherUid,
        message: `BabyHealth Guard: Your ${type.toLowerCase()} visit is scheduled for ${dateText} at ${clinic}. Please keep your phone nearby.`,
        category: "ussd_appointment_confirmation",
        sentBy: context.uid,
        consentConfirmed: true,
      });
      confirmationStatus = result.status;
    } catch (error) {
      console.error("USSD appointment confirmation could not be sent", error);
    }
    await appointmentRef.update({
      confirmationStatus,
      confirmationUpdatedAt: FieldValue.serverTimestamp(),
    });
    return Response.json({ appointmentId, confirmationStatus }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return apiError(error);
  }
}
