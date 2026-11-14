import { apiError, requireStaff } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const context = await requireStaff(request);
    const snapshot = await getAdminDb()
      .collection("users")
      .where("role", "==", "midwife")
      .where("facilityId", "==", context.facilityId)
      .get();
    const midwives = snapshot.docs
      .map((entry) => {
        const data = entry.data();
        if (data.disabled === true) return null;
        return {
          uid: entry.id,
          fullName: typeof data.fullName === "string" ? data.fullName : "",
          phone: typeof data.phone === "string" ? data.phone : "",
          facilityId: typeof data.facilityId === "string" ? data.facilityId : "",
          facilityName: typeof data.facilityName === "string" ? data.facilityName : "",
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry?.fullName))
      .sort((left, right) => left.fullName.localeCompare(right.fullName));

    return Response.json({ midwives });
  } catch (error) {
    return apiError(error);
  }
}