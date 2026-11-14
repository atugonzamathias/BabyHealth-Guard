import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { apiError, getMotherInStaffFacility, requireAdmin } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  try {
    const context = await requireAdmin(request);
    const snapshot = await getAdminDb()
      .collection("ussd_requests")
      .where("status", "==", "pending")
      .get();
    const requests = (await Promise.all(snapshot.docs.map(async (document) => {
        const data = document.data() as DocumentData;
        const motherUid = text(data.motherId);
        if (!motherUid) return null;
        try {
          await getMotherInStaffFacility(motherUid, context);
        } catch {
          return null;
        }
        const createdAt =
          data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : null;
        return {
          id: document.id,
          motherName: text(data.motherName) || "Mother",
          phone: text(data.phone),
          clinic: text(data.clinic),
          requestType: text(data.requestType),
          appointmentType: text(data.appointmentType),
          preferredWindow: text(data.preferredWindow),
          createdAt,
        };
      }))).filter((request): request is NonNullable<typeof request> => Boolean(request))
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

export async function PATCH() {
  return Response.json(
    { error: "Use the approve or decline USSD request endpoint." },
    { status: 410 },
  );
}
