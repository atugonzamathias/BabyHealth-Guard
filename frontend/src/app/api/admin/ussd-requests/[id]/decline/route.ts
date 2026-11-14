import { FieldValue } from "firebase-admin/firestore";
import { apiError, getMotherInStaffFacility, requireAdmin } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendSmsToMother } from "@/lib/sms-server";

export const runtime = "nodejs";

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
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const reason = text(payload?.reason);
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id) || !reason || reason.length > 300) {
      return Response.json({ error: "A decline reason is required." }, { status: 400 });
    }
    const db = getAdminDb();
    const ref = db.doc(`ussd_requests/${id}`);
    const snapshot = await ref.get();
    if (!snapshot.exists) return Response.json({ error: "USSD request was not found." }, { status: 404 });
    const data = snapshot.data() ?? {};
    if (text(data.status) !== "pending") {
      return Response.json({ error: "This USSD request has already been reviewed." }, { status: 409 });
    }
    const motherUid = text(data.motherId);
    if (!motherUid) return Response.json({ error: "USSD request has no valid mother." }, { status: 422 });
    await getMotherInStaffFacility(motherUid, context);
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(ref);
      if (!current.exists || text(current.data()?.status) !== "pending") {
        throw new Error("already-reviewed");
      }
      transaction.update(ref, {
        status: "declined",
        declineReason: reason,
        reviewedBy: context.uid,
        reviewedAt: FieldValue.serverTimestamp(),
      });
    });
    const result = await sendSmsToMother({
      motherUid,
      message: `BabyHealth Guard: Your ${text(data.requestType) || "visit"} request was declined. Reason: ${reason}`,
      category: "ussd_visit_declined",
      sentBy: context.uid,
      consentConfirmed: true,
    });
    return Response.json({ updated: true, smsStatus: result.status });
  } catch (error) {
    if (error instanceof Error && error.message === "already-reviewed") {
      return Response.json({ error: "This USSD request has already been reviewed." }, { status: 409 });
    }
    return apiError(error);
  }
}
