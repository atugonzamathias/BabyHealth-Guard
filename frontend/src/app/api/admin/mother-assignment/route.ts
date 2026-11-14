import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { apiError, requireAdmin, getMotherInStaffFacility } from "@/lib/api-auth";
import { getAdminApp, getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const STAFF_ROLES = [
  "doctor",
  "admin",
  "health_worker",
  "health worker",
  "nurse",
  "midwife",
];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validUid(value: string): boolean {
  return value.length > 0 && value.length <= 128 && !value.includes("/");
}

function validPhone(value: string): boolean {
  return value.length <= 40 && /^\+?[0-9][0-9\s()-]{6,24}$/.test(value);
}

export async function GET(request: Request) {
  try {
    const context = await requireAdmin(request);
    const adminAuth = getAuth(getAdminApp());
    const staffQuery = getAdminDb().collection("users").where("role", "in", STAFF_ROLES);
    const [staffSnapshot, authUsers] = await Promise.all([
      context.isSystemAdmin
        ? staffQuery.get()
        : staffQuery.where("facilityId", "==", context.facilityId).get(),
      (async () => {
        const users: Awaited<ReturnType<typeof adminAuth.listUsers>>["users"] = [];
        let pageToken: string | undefined;
        do {
          const page = await adminAuth.listUsers(1000, pageToken);
          users.push(...page.users);
          pageToken = page.pageToken;
        } while (pageToken);
        return users;
      })(),
    ]);

    const authByUid = new Map(authUsers.map((user) => [user.uid, user]));
    const staff = staffSnapshot.docs
      .map((snapshot) => {
        const profile = snapshot.data();
        const authUser = authByUid.get(snapshot.id);
        const role = text(profile.role).toLowerCase();
        const fullName = text(profile.fullName);
        const phone = text(profile.phone);
        if (
          !authUser ||
          authUser.disabled ||
          profile.disabled === true ||
          !STAFF_ROLES.includes(role) ||
          !fullName ||
          !validPhone(phone)
        ) {
          return null;
        }
        return {
          uid: snapshot.id,
          fullName,
          phone,
          role,
          facilityId: text(profile.facilityId),
          facilityName: text(profile.facilityName),
        };
      })
      .filter((member): member is NonNullable<typeof member> => member !== null)
      .sort((left, right) => left.fullName.localeCompare(right.fullName));

    return Response.json({ staff });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireAdmin(request);
    const payload = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!payload || Array.isArray(payload)) {
      return Response.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }

    const motherUid = text(payload.motherUid);
    const staffUid = text(payload.staffUid);
    if (!validUid(motherUid)) {
      return Response.json({ error: "A valid mother UID is required." }, { status: 400 });
    }
    if (staffUid && !validUid(staffUid)) {
      return Response.json({ error: "A valid staff UID is required." }, { status: 400 });
    }

    const db = getAdminDb();
    const motherData = await getMotherInStaffFacility(motherUid, context);
    const motherFacilityId = text(motherData.facilityId);
    if (!motherFacilityId && !context.isSystemAdmin && staffUid) {
      return Response.json({ error: "Mother profile is missing a facility assignment." }, { status: 403 });
    }

    if (!staffUid) {
      await db.doc(`users/${motherUid}`).update({
        assignedStaffUid: FieldValue.delete(),
        assignedStaffName: FieldValue.delete(),
        assignedStaffPhone: FieldValue.delete(),
        assignedStaffRole: FieldValue.delete(),
        assignedStaffFacilityId: FieldValue.delete(),
        assignedStaffFacilityName: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return Response.json({ motherUid, assignedStaff: null, updated: true });
    }

    const staffRef = db.doc(`users/${staffUid}`);
    const staffSnapshot = await staffRef.get();
    if (!staffSnapshot.exists) {
      return Response.json({ error: "Selected staff profile was not found." }, { status: 404 });
    }

    const staffProfile = staffSnapshot.data() ?? {};
    const role = text(staffProfile.role).toLowerCase();
    const fullName = text(staffProfile.fullName);
    const phone = text(staffProfile.phone);
    const staffFacilityId = text(staffProfile.facilityId);
    if (staffProfile.disabled === true || !STAFF_ROLES.includes(role)) {
      return Response.json({ error: "Selected staff member is not active." }, { status: 400 });
    }
    if (!fullName || !validPhone(phone)) {
      return Response.json(
        { error: "Selected staff member must have a name and valid phone number." },
        { status: 400 },
      );
    }
    if (!staffFacilityId || (!context.isSystemAdmin && staffFacilityId !== motherFacilityId)) {
      return Response.json(
        { error: "Selected staff member does not belong to the same facility as the mother." },
        { status: 403 },
      );
    }

    let authUser;
    try {
      authUser = await getAuth(getAdminApp()).getUser(staffUid);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "auth/user-not-found"
      ) {
        return Response.json({ error: "Selected staff member is not active." }, { status: 400 });
      }
      throw error;
    }
    if (authUser.disabled) {
      return Response.json({ error: "Selected staff member is not active." }, { status: 400 });
    }

    const assignedStaff = {
      uid: staffUid,
      fullName,
      phone,
      role,
      facilityId: staffFacilityId,
      facilityName: text(staffProfile.facilityName),
    };
    await db.doc(`users/${motherUid}`).update({
      facilityId: staffFacilityId,
      facilityName: text(staffProfile.facilityName),
      assignedStaffUid: staffUid,
      assignedStaffName: fullName,
      assignedStaffPhone: phone,
      assignedStaffRole: role,
      assignedStaffFacilityId: staffFacilityId,
      assignedStaffFacilityName: text(staffProfile.facilityName),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ motherUid, assignedStaff, updated: true });
  } catch (error) {
    return apiError(error);
  }
}