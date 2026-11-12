import { getAuth } from "firebase-admin/auth";
import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { apiError, requireAdmin } from "@/lib/api-auth";
import { getAdminApp, getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const VALID_STAFF_ROLES = new Set([
  "doctor",
  "admin",
  "health_worker",
  "nurse",
  "midwife",
]);

function normalizeRole(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isAllowedRole(value: string): boolean {
  return VALID_STAFF_ROLES.has(value);
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = getAdminDb();
    const usersSnapshot = await db
      .collection("users")
      .where("role", "in", [...VALID_STAFF_ROLES])
      .get();
    const authUsers = await getAuth(getAdminApp()).listUsers();
    const disabledByUid = new Map<string, boolean>();
    for (const user of authUsers.users) {
      disabledByUid.set(user.uid, user.disabled ?? false);
    }

    const staff = usersSnapshot.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const role = normalizeRole(data.role);
        if (!role || !isAllowedRole(role)) return null;

        return {
          uid: doc.id,
          fullName: normalizeText(data.fullName),
          email: normalizeText(data.email),
          phone: normalizeText(data.phone),
          role,
          facilityName: normalizeText(data.facilityName),
          facilityId: normalizeText(data.facilityId),
          disabled: disabledByUid.get(doc.id) ?? false,
        };
      })
      .filter((member): member is NonNullable<typeof member> => Boolean(member));

    const activeMidwives = staff.filter(
      (member) => member.role === "midwife" && !member.disabled,
    );
    const directory = db.collection("staffDirectory");
    const existingDirectory = await directory.get();
    const activeIds = new Set(activeMidwives.map((member) => member.uid));
    const directoryOperations: Array<
      | { type: "delete"; ref: DocumentReference }
      | { type: "set"; ref: DocumentReference; data: Record<string, unknown> }
    > = [];
    for (const entry of existingDirectory.docs) {
      if (!activeIds.has(entry.id)) {
        directoryOperations.push({ type: "delete", ref: entry.ref });
      }
    }
    for (const midwife of activeMidwives) {
      directoryOperations.push({
        type: "set",
        ref: directory.doc(midwife.uid),
        data: {
          fullName: midwife.fullName,
          phone: midwife.phone,
          facilityName: midwife.facilityName,
          role: "midwife",
          active: true,
          updatedAt: FieldValue.serverTimestamp(),
        },
      });
    }
    for (let start = 0; start < directoryOperations.length; start += 450) {
      const batch = db.batch();
      for (const operation of directoryOperations.slice(start, start + 450)) {
        if (operation.type === "delete") batch.delete(operation.ref);
        else batch.set(operation.ref, operation.data);
      }
      await batch.commit();
    }

    return Response.json({ staff });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const payload = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!payload || Array.isArray(payload)) {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const fullName = normalizeText(payload.fullName);
    const email = normalizeText(payload.email).toLowerCase();
    const phone = normalizeText(payload.phone);
    const password = normalizeText(payload.password);
    const role = normalizeRole(payload.role);
    const requestedFacilityId = normalizeText(payload.facilityId);

    if (!fullName || !email || !phone || !password || !role) {
      return Response.json({ error: "Full name, email, phone number, password, and role are required." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (phone.length > 40 || !/^\+?[0-9][0-9\s()-]{6,24}$/.test(phone)) {
      return Response.json({ error: "Enter a valid staff phone number." }, { status: 400 });
    }
    if (!isAllowedRole(role)) {
      return Response.json({ error: "Select a valid staff role." }, { status: 400 });
    }
    if (!requestedFacilityId) {
      return Response.json({ error: "Select a facility from the administrator's facility list." }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    const facilitySnapshot = await getAdminDb()
      .collection("facilities")
      .doc(requestedFacilityId)
      .get();
    if (!facilitySnapshot.exists) {
      return Response.json({ error: "The selected facility was not found. Refresh the facility list." }, { status: 400 });
    }
    const facilityName = normalizeText(facilitySnapshot.data()?.name);
    if (!facilityName) {
      return Response.json({ error: "The selected facility has no valid name." }, { status: 400 });
    }
    const facilityId = facilitySnapshot.id;

    const adminAuth = getAuth(getAdminApp());
    const existingUser = await adminAuth.getUserByEmail(email).catch(() => null);
    if (existingUser) {
      return Response.json({ error: "A staff account with that email already exists." }, { status: 409 });
    }

    const user = await adminAuth.createUser({
      email,
      password,
      displayName: fullName,
      disabled: false,
    });

    const staffProfile = {
      uid: user.uid,
      email,
      phone,
      fullName,
      role,
      facilityName,
      facilityId,
      disabled: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await getAdminDb().doc(`users/${user.uid}`).set(staffProfile, { merge: true });
    if (role === "midwife") {
      await getAdminDb().collection("staffDirectory").doc(user.uid).set({
        fullName,
        phone,
        facilityName,
        role,
        active: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return Response.json(
      {
        uid: user.uid,
        fullName,
        email,
        phone,
        role,
        facilityName,
        facilityId,
        disabled: false,
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { uid: adminUid } = await requireAdmin(request);
    const payload = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!payload || Array.isArray(payload)) {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const targetUid = normalizeText(payload.uid);
    const requestedRole = normalizeRole(payload.role);
    const requestedDisabled = payload.disabled;

    if (!targetUid) {
      return Response.json({ error: "A staff member UID is required." }, { status: 400 });
    }
    if (requestedRole && !isAllowedRole(requestedRole)) {
      return Response.json({ error: "Select a valid staff role." }, { status: 400 });
    }
    if (requestedDisabled !== undefined && typeof requestedDisabled !== "boolean") {
      return Response.json({ error: "Disabled status must be true or false." }, { status: 400 });
    }

    const staffProfileRef = getAdminDb().doc(`users/${targetUid}`);
    const currentProfile = await staffProfileRef.get();
    if (!currentProfile.exists) {
      return Response.json({ error: "Staff profile was not found." }, { status: 404 });
    }

    if (
      typeof requestedDisabled === "boolean" &&
      requestedDisabled === true &&
      targetUid === adminUid
    ) {
      return Response.json({ error: "You cannot disable your own administrator account." }, { status: 403 });
    }
    if (requestedDisabled === true) {
      const assignedMothers = await getAdminDb()
        .collection("users")
        .where("assignedStaffUid", "==", targetUid)
        .limit(1)
        .get();
      if (!assignedMothers.empty) {
        return Response.json(
          {
            error:
              "This staff member is assigned to a mother. Reassign the mother before disabling this account.",
          },
          { status: 409 },
        );
      }
    }

    const adminAuth = getAuth(getAdminApp());
    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (requestedRole) {
      updateData.role = requestedRole;
    }
    if (requestedDisabled !== undefined) {
      updateData.disabled = requestedDisabled;
      await adminAuth.updateUser(targetUid, { disabled: requestedDisabled });
    }

    if (Object.keys(updateData).length > 1 || requestedRole || requestedDisabled !== undefined) {
      await staffProfileRef.update(updateData);
    }

    const refreshedProfile = await staffProfileRef.get();
    const refreshedData = refreshedProfile.data();
    const finalRole = normalizeRole(refreshedData?.role);
    const finalDisabled = !!(await adminAuth.getUser(targetUid)).disabled;
    const directoryRef = getAdminDb().collection("staffDirectory").doc(targetUid);
    if (finalRole === "midwife" && !finalDisabled) {
      await directoryRef.set({
        fullName: normalizeText(refreshedData?.fullName),
        phone: normalizeText(refreshedData?.phone),
        facilityName: normalizeText(refreshedData?.facilityName),
        role: "midwife",
        active: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await directoryRef.delete();
    }

    return Response.json({
      uid: targetUid,
      role: finalRole,
      disabled: finalDisabled,
      updated: true,
    });
  } catch (error) {
    return apiError(error);
  }
}
