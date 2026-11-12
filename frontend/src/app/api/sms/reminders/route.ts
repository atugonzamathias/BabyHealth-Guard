import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { apiError } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendSmsToMother } from "@/lib/sms-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const cronSecret = process.env.SMS_REMINDER_CRON_SECRET;
  if (!cronSecret) {
    return Response.json({ error: "Reminder scheduler is not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
  const db = getAdminDb();
  const due = await db
    .collectionGroup("appointments")
    .where("reminderStatus", "==", "pending")
    .where("reminderAt", "<=", Timestamp.now())
    .orderBy("reminderAt")
    .limit(100)
    .get();
  let accepted = 0;
  let failed = 0;
  let skipped = 0;

  for (const appointmentSnapshot of due.docs) {
    const appointmentRef = appointmentSnapshot.ref;
    const motherRef = appointmentRef.parent.parent;
    if (!motherRef) continue;

    const claimed = await db.runTransaction(async (transaction) => {
      const current = await transaction.get(appointmentRef);
      const data = current.data();
      const reminderAt = data?.reminderAt;
      if (
        !current.exists ||
        data?.reminderStatus !== "pending" ||
        !(reminderAt instanceof Timestamp) ||
        reminderAt.toMillis() > Date.now()
      ) {
        return null;
      }
      if (
        ["completed", "cancelled", "canceled"].includes(
          String(data.status ?? "scheduled").toLowerCase(),
        ) ||
        data.smsConsentConfirmed !== true
      ) {
        transaction.update(appointmentRef, {
          reminderStatus: "skipped",
          reminderUpdatedAt: FieldValue.serverTimestamp(),
        });
        return { skipped: true as const };
      }
      transaction.update(appointmentRef, {
        reminderStatus: "sending",
        reminderUpdatedAt: FieldValue.serverTimestamp(),
      });
      return { skipped: false as const, data };
    });
    if (!claimed) continue;
    if (claimed.skipped) {
      skipped += 1;
      continue;
    }

    const scheduledAt = claimed.data.scheduledAt;
    if (!(scheduledAt instanceof Timestamp)) {
      await appointmentRef.update({
        reminderStatus: "failed",
        reminderUpdatedAt: FieldValue.serverTimestamp(),
      });
      failed += 1;
      continue;
    }
    const dateText = scheduledAt.toDate().toLocaleString("en-UG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Kampala",
    });
    try {
      const result = await sendSmsToMother({
        motherUid: motherRef.id,
        message: `BabyHealth Guard reminder: Your ${String(claimed.data.type ?? "clinic")} visit is ${dateText} at ${String(claimed.data.clinic ?? "your clinic")}. Contact your health worker if you need to change it.`,
        category: "appointment_reminder",
        sentBy: "scheduled_reminder",
        consentConfirmed: true,
      });
      await appointmentRef.update({
        reminderStatus: result.status,
        reminderUpdatedAt: FieldValue.serverTimestamp(),
      });
      if (result.status === "accepted") accepted += 1;
      else failed += 1;
    } catch (error) {
      console.error("Appointment reminder could not be sent", error);
      await appointmentRef.update({
        reminderStatus: "failed",
        reminderUpdatedAt: FieldValue.serverTimestamp(),
      });
      failed += 1;
    }
  }
  return Response.json({ processed: accepted + failed + skipped, accepted, failed, skipped });
  } catch (error) {
    return apiError(error);
  }
}
