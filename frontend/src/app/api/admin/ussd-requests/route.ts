import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { apiError, requireAdmin } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snapshot = await getAdminDb()
      .collection("ussd_requests")
      .where("status", "==", "pending")
      .get();
    const requests = snapshot.docs
      .map((document) => {
        const data = document.data() as DocumentData;
        const createdAt =
          data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : null;
        return {
          id: document.id,
          motherName: text(data.motherName) || "Mother",
          phone: text(data.phone),
          clinic: text(data.clinic),
          requestType: text(data.requestType),
          preferredWindow: text(data.preferredWindow),
          createdAt,
        };
      })
      .sort(
        (left, right) =>
          new Date(right.createdAt ?? 0).getTime() -
          new Date(left.createdAt ?? 0).getTime(),
      )
      .slice(0, 100);
    return Response.json({ requests, hasMore: snapshot.size > requests.length });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { uid } = await requireAdmin(request);
    const payload = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const requestId = text(payload?.requestId);
    const status = text(payload?.status);
    if (
      !payload ||
      Array.isArray(payload) ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(requestId) ||
      !["reviewed", "declined"].includes(status)
    ) {
      return Response.json({ error: "USSD request update is invalid." }, { status: 400 });
    }

    const ref = getAdminDb().collection("ussd_requests").doc(requestId);
    const updated = await getAdminDb().runTransaction(async (transaction) => {
      const current = await transaction.get(ref);
      if (!current.exists) return "missing";
      if (current.data()?.status !== "pending") return "already-reviewed";
      transaction.update(ref, {
        status,
        reviewedBy: uid,
        reviewedAt: FieldValue.serverTimestamp(),
      });
      return "updated";
    });
    if (updated === "missing") {
      return Response.json({ error: "USSD request was not found." }, { status: 404 });
    }
    if (updated !== "updated") {
      return Response.json(
        { error: "This USSD request has already been reviewed." },
        { status: 409 },
      );
    }
    return Response.json({ updated: true });
  } catch (error) {
    return apiError(error);
  }
}
