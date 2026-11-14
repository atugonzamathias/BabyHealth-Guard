import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { apiError, requireStaff, getMotherInStaffFacility } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendSmsToMother } from "@/lib/sms-server";

export const runtime = "nodejs";

const allowedTypes = new Set(["ANTENATAL", "DELIVERY", "POSTNATAL", "IMMUNIZATION"]);
const allowedReminderMinutes = new Set([5, 30, 60, 720, 1440]);

export async function POST(request: Request) {
  try {
    const context = await requireStaff(request);
    const payload = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!payload || Array.isArray(payload)) {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    const motherUid = typeof payload.motherUid === "string" ? payload.motherUid.trim() : "";
    const type = typeof payload.type === "string" ? payload.type.trim() : "";
    const clinic = typeof payload.clinic === "string" ? payload.clinic.trim() : "";
    const agenda = typeof payload.agenda === "string" ? payload.agenda.trim() : "";
    const scheduledAtMillis =
      typeof payload.scheduledAtMillis === "number" ? payload.scheduledAtMillis : NaN;
    const reminderMinutes =
      typeof payload.reminderMinutes === "number" ? payload.reminderMinutes : NaN;
    const sendSms = payload.sendSms === true;
    const consentConfirmed = payload.smsConsentConfirmed === true;

    if (
      !/^[A-Za-z0-9_-]{1,128}$/.test(motherUid) ||
      !allowedTypes.has(type) ||
      !Number.isFinite(scheduledAtMillis) ||
      !allowedReminderMinutes.has(reminderMinutes) ||
      clinic.length > 120 ||
      agenda.length > 500 ||
      (sendSms && !consentConfirmed)
    ) {
      return Response.json({ error: "Appointment details are invalid." }, { status: 400 });
    }
    const now = Date.now();
    if (
      scheduledAtMillis <= now ||
      (sendSms && reminderMinutes * 60_000 > scheduledAtMillis - now)
    ) {
      return Response.json(
        { error: "Choose a future visit and a reminder interval that fits before it." },
        { status: 400 },
      );
    }

    const motherData = await getMotherInStaffFacility(motherUid, context);
    const motherRef = getAdminDb().doc(`users/${motherUid}`);
    const appointmentRef = motherRef.collection("appointments").doc();
    const scheduledAt = Timestamp.fromMillis(scheduledAtMillis);
    const assignedStaffUid =
      typeof motherData.assignedStaffUid === "string" ? motherData.assignedStaffUid.trim() : "";
    let midwifeName =
      typeof motherData.assignedStaffName === "string" ? motherData.assignedStaffName.trim() : "";
    if (assignedStaffUid) {
      const assignedStaff = await getAdminDb().doc(`users/${assignedStaffUid}`).get();
      const assignedData = assignedStaff.data() ?? {};
      if (
        assignedStaff.exists &&
        assignedData.disabled !== true &&
        String(assignedData.role ?? "").trim().toLowerCase() === "midwife" &&
        typeof assignedData.fullName === "string"
      ) {
        midwifeName = assignedData.fullName.trim();
      }
    }
    await appointmentRef.create({
      type,
      scheduledAt,
      clinic,
      agenda,
      facilityId: motherData.facilityId,
      facilityName: motherData.facilityName,
      midwifeName,
      status: "scheduled",
      reminderMinutes,
      reminderAt: Timestamp.fromMillis(scheduledAtMillis - reminderMinutes * 60_000),
      reminderStatus: sendSms ? "pending" : "disabled",
      sendConfirmation: sendSms,
      smsConsentConfirmed: sendSms && consentConfirmed,
      confirmationStatus: sendSms ? "queued" : "disabled",
      createdBy: context.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    let confirmationStatus: "accepted" | "failed" | "disabled" = "disabled";
    if (sendSms) {
      const dateText = scheduledAt.toDate().toLocaleString("en-UG", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Kampala",
      });
      try {
        const result = await sendSmsToMother({
          motherUid,
          message: `BabyHealth Guard: Your ${type.toLowerCase()} visit is scheduled for ${dateText} at ${clinic || "your clinic"}. Contact your health worker if you need to change it.`,
          category: "appointment_confirmation",
          sentBy: context.uid,
          consentConfirmed: true,
        });
        confirmationStatus = result.status;
      } catch (error) {
        console.error("Appointment confirmation could not be sent", error);
        confirmationStatus = "failed";
      }
      await appointmentRef.update({
        confirmationStatus,
        confirmationUpdatedAt: FieldValue.serverTimestamp(),
      });
    }
    return Response.json({ appointmentId: appointmentRef.id, confirmationStatus });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireStaff(request);
    const payload = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!payload || Array.isArray(payload)) {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    const motherUid = typeof payload.motherUid === "string" ? payload.motherUid.trim() : "";
    const appointmentId =
      typeof payload.appointmentId === "string" ? payload.appointmentId.trim() : "";
    const status = typeof payload.status === "string" ? payload.status : "";
    if (
      !/^[A-Za-z0-9_-]{1,128}$/.test(motherUid) ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(appointmentId) ||
      !["scheduled", "completed", "cancelled"].includes(status)
    ) {
      return Response.json({ error: "Appointment status update is invalid." }, { status: 400 });
    }
    const motherData = await getMotherInStaffFacility(motherUid, context);
    const appointmentRef = getAdminDb().doc(
      `users/${motherUid}/appointments/${appointmentId}`,
    );
    const appointment = await appointmentRef.get();
    if (!appointment.exists) {
      return Response.json({ error: "Appointment was not found." }, { status: 404 });
    }
    if (appointment.data()?.facilityId && appointment.data()?.facilityId !== motherData.facilityId) {
      return Response.json({ error: "This appointment is outside your facility." }, { status: 403 });
    }
    await appointmentRef.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: context.uid,
      ...(status === "cancelled" && appointment.data()?.reminderStatus === "pending"
        ? { reminderStatus: "cancelled" }
        : {}),
    });
    return Response.json({ updated: true });
  } catch (error) {
    return apiError(error);
  }
}