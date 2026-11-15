import { getAdminDb } from "@/lib/firebase-admin";
import type { DocumentData } from "firebase-admin/firestore";
import { apiError, requireStaffContext } from "@/lib/api-auth";

const OPEN_STATUSES = new Set(["PENDING_ACTION", "ACKNOWLEDGED"]);

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await requireStaffContext(request);
    const snapshot = await getAdminDb().collection("dangerSignReports").get();
    const alerts = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() } as DocumentData & { id: string }))
      .filter((alert) => {
        if (!OPEN_STATUSES.has(String(alert.status))) return false;
        const sameFacility =
          context.isSystemAdmin || alert.facilityId === context.facilityId;
        if (!sameFacility) return false;
        if (alert.assignedMidwifeId) return alert.assignedMidwifeId === context.uid;
        return context.isSystemAdmin;
      })
      .sort((a, b) => {
        const left = a.createdAt?.toMillis?.() ?? 0;
        const right = b.createdAt?.toMillis?.() ?? 0;
        return right - left;
      })
      .map((alert) => ({
        ...alert,
        createdAt: alert.createdAt?.toDate?.()?.toISOString() ?? null,
        acknowledgedAt: alert.acknowledgedAt?.toDate?.()?.toISOString() ?? null,
        referredAt: alert.referredAt?.toDate?.()?.toISOString() ?? null,
        resolvedAt: alert.resolvedAt?.toDate?.()?.toISOString() ?? null,
      }));
    return Response.json({ alerts });
  } catch (error) {
    return apiError(error);
  }
}
