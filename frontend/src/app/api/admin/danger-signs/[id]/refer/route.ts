import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { apiError, ApiAuthError, requireStaffContext } from "@/lib/api-auth";
import { normalizeE164, sendSmsToMother, sendSmsToStaff } from "@/lib/sms-server";

type RouteContext = { params: Promise<{ id: string }> };

function text(value: unknown, max = 1000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(
  request: Request,
  routeContext: RouteContext,
): Promise<Response> {
  try {
    const context = await requireStaffContext(request);
    const { id } = await routeContext.params;
    const db = getAdminDb();
    const alertRef = db.collection("dangerSignReports").doc(id);
    const snapshot = await alertRef.get();
    if (!snapshot.exists) throw new ApiAuthError("Danger alert was not found.", 404);

    const alert = snapshot.data() ?? {};
    if (!context.isSystemAdmin && alert.facilityId !== context.facilityId) {
      throw new ApiAuthError("This danger alert is outside your facility.", 403);
    }
    if (alert.assignedMidwifeId && alert.assignedMidwifeId !== context.uid) {
      throw new ApiAuthError("This danger alert is assigned to another staff member.", 403);
    }
    if (!alert.assignedMidwifeId && !context.isSystemAdmin) {
      throw new ApiAuthError("Only a global administrator can handle an unassigned alert.", 403);
    }
    if (!["PENDING_ACTION", "ACKNOWLEDGED"].includes(text(alert.status))) {
      throw new ApiAuthError("Only active emergency alerts can be referred.", 409);
    }
    if (alert.referralLogged === true) {
      throw new ApiAuthError("A referral has already been logged for this alert.", 409);
    }

    const body = await request.json() as {
      referredToFacility?: unknown;
      transportPhone?: unknown;
      referralNotes?: unknown;
      notifyMother?: unknown;
    };
    const referredToFacility = text(body.referredToFacility, 160);
    const referralNotes = text(body.referralNotes, 1000);
    const rawTransportPhone = text(body.transportPhone, 40);
    const transportPhone = rawTransportPhone ? normalizeE164(rawTransportPhone) : "";
    if (!referredToFacility) {
      throw new ApiAuthError("Receiving facility is required.", 400);
    }
    if (!referralNotes) {
      throw new ApiAuthError("Clinical referral notes are required.", 400);
    }
    if (rawTransportPhone && !transportPhone) {
      throw new ApiAuthError("Enter a valid Uganda phone number.", 422);
    }

    const referringName = text(context.token.name) || context.uid;
    const updates = {
      status: "REFERRED",
      referralLogged: true,
      referredToFacility,
      transportPhone: transportPhone || null,
      referralNotes,
      referredBy: context.uid,
      referredByName: referringName,
      referredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await alertRef.update(updates);

    await db.doc(`users/${alert.motherId}/healthLogs/referral_${id}`).set({
      type: "REFERRAL_ISSUED",
      symptom: alert.symptom,
      urgency: alert.urgency || "CRITICAL",
      receivingFacility: referredToFacility,
      transportPhone: transportPhone || null,
      description: referralNotes,
      status: "open",
      source: "web_staff",
      facilityId: alert.facilityId,
      facilityName: alert.facilityName,
      recordedBy: context.uid,
      recordedByName: referringName,
      createdAt: FieldValue.serverTimestamp(),
    });
    await db.doc(`users/${alert.motherId}/referrals/${id}`).set({
      patientName: alert.motherName,
      patientType: "mother",
      reason: alert.symptom,
      destination: referredToFacility,
      receivingUnit: "Emergency referral",
      receivingContact: transportPhone || "",
      urgency: "emergency",
      notes: referralNotes,
      status: "referred",
      source: "danger_sign_triage",
      dangerSignReportId: id,
      facilityId: alert.facilityId,
      facilityName: alert.facilityName,
      createdBy: context.uid,
      createdByName: referringName,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const smsResults: string[] = [];
    if (body.notifyMother !== false) {
      try {
        const result = await sendSmsToMother({
          motherUid: String(alert.motherId),
          message: `BabyHealthGuard: You have been referred to ${referredToFacility} for urgent care. Proceed immediately with your health card.`,
          category: "danger_referral",
          sentBy: context.uid,
          consentConfirmed: true,
        });
        smsResults.push(`mother:${result.status}`);
      } catch (error) {
        console.error("Referral mother SMS failed", error);
        smsResults.push("mother:failed");
      }
    }
    if (transportPhone) {
      const result = await sendSmsToStaff({
        motherUid: String(alert.motherId),
        staffUid: `transport:${id}`,
        staffPhone: transportPhone,
        sessionId: `referral:${id}`,
        message: `URGENT REFERRAL from ${text(alert.facilityName, 50)}: ${text(alert.motherName, 40)} (${text(alert.phone, 20)}) - ${text(alert.symptom, 50)}. En route to ${referredToFacility}.`,
      });
      smsResults.push(`transport:${result}`);
    }

    return Response.json({ ok: true, status: "REFERRED", sms: smsResults });
  } catch (error) {
    return apiError(error);
  }
}
