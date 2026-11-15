import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { apiError, ApiAuthError, requireStaffContext } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

function text(value: unknown, max = 1000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function PATCH(request: Request, routeContext: RouteContext): Promise<Response> {
  try {
    const context = await requireStaffContext(request);
    const { id } = await routeContext.params;
    const ref = getAdminDb().collection("dangerSignReports").doc(id);
    const snapshot = await ref.get();
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

    const body = await request.json() as {
      status?: string;
      referralSent?: boolean;
      referralNotes?: string;
    };
    const status = text(body.status, 30).toUpperCase();
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      lastActionBy: context.uid,
      lastActionByName: text(context.token.name) || context.uid,
    };
    if (status === "ACKNOWLEDGED") {
      if (alert.status !== "PENDING_ACTION") {
        throw new ApiAuthError("Only pending alerts can be acknowledged.", 409);
      }
      updates.status = status;
      updates.acknowledgedBy = context.uid;
      updates.acknowledgedByName = text(context.token.name) || context.uid;
      updates.acknowledgedAt = FieldValue.serverTimestamp();
    } else if (status === "RESOLVED") {
      const notes = text(body.referralNotes);
      if (!notes) throw new ApiAuthError("Clinical resolution notes are required.", 400);
      updates.status = status;
      updates.resolutionNotes = notes;
      updates.resolvedBy = context.uid;
      updates.resolvedByName = text(context.token.name) || context.uid;
      updates.resolvedAt = FieldValue.serverTimestamp();
      await getAdminDb().doc(`users/${alert.motherId}/healthLogs/${id}`).set({
        type: "danger_sign_resolution",
        description: notes,
        severity: "CRITICAL",
        source: "web_staff",
        status: "resolved",
        facilityId: alert.facilityId,
        facilityName: alert.facilityName,
        recordedBy: context.uid,
        recordedByName: text(context.token.name) || context.uid,
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else if (body.referralSent === true) {
      const notes = text(body.referralNotes);
      if (!notes) throw new ApiAuthError("Referral notes are required.", 400);
      updates.referralSent = true;
      updates.referralNotes = notes;
      updates.referredBy = context.uid;
      updates.referredByName = text(context.token.name) || context.uid;
      updates.referredAt = FieldValue.serverTimestamp();
    } else {
      throw new ApiAuthError("Use ACKNOWLEDGED, RESOLVED, or referralSent.", 400);
    }
    await ref.update(updates);
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
