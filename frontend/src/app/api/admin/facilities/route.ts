import { FieldValue } from "firebase-admin/firestore";
import { apiError, requireAdmin } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function normalizeName(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const snapshot = await getAdminDb().collection("facilities").orderBy("name").get();
    const facilities = snapshot.docs.map((facility) => ({
      id: facility.id,
      name: normalizeName(facility.data().name),
    }));
    return Response.json({ facilities });
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

    const name = normalizeName(payload.name);
    if (!name || name.length > 120) {
      return Response.json(
        { error: "Facility name is required and must be 120 characters or fewer." },
        { status: 400 },
      );
    }

    const normalizedName = name.toLocaleLowerCase();
    const existing = await getAdminDb()
      .collection("facilities")
      .where("normalizedName", "==", normalizedName)
      .limit(1)
      .get();
    if (!existing.empty) {
      return Response.json({ error: "That facility is already in the list." }, { status: 409 });
    }

    const db = getAdminDb();
    const existingFacilities = await db.collection("facilities").get();
    const highestExistingId = existingFacilities.docs.reduce((highest, facility) => {
      const match = /^FAC-(\d+)$/.exec(facility.id);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    const counterRef = db.collection("_metadata").doc("facilityIdCounter");
    let facilityId = "";

    await db.runTransaction(async (transaction) => {
      const counter = await transaction.get(counterRef);
      const currentValue = counter.data()?.value;
      const counterValue = typeof currentValue === "number" ? currentValue : 0;
      const nextId = Math.max(counterValue, highestExistingId) + 1;
      facilityId = `FAC-${String(nextId).padStart(3, "0")}`;
      const facilityRef = db.collection("facilities").doc(facilityId);
      transaction.create(facilityRef, {
        facilityId,
        name,
        normalizedName,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(counterRef, { value: nextId }, { merge: true });
    });

    return Response.json(
      { facility: { id: facilityId, name }, facilityId },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
    const payload = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!payload || Array.isArray(payload)) {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const id = normalizeName(payload.id);
    const name = normalizeName(payload.name);
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id) || !name || name.length > 120) {
      return Response.json({ error: "Facility ID or name is invalid." }, { status: 400 });
    }

    const db = getAdminDb();
    const facilityRef = db.collection("facilities").doc(id);
    const facilitySnapshot = await facilityRef.get();
    if (!facilitySnapshot.exists) {
      return Response.json({ error: "Facility was not found." }, { status: 404 });
    }

    const normalizedName = name.toLocaleLowerCase();
    const duplicate = await db
      .collection("facilities")
      .where("normalizedName", "==", normalizedName)
      .limit(2)
      .get();
    if (duplicate.docs.some((facility) => facility.id !== id)) {
      return Response.json({ error: "That facility is already in the list." }, { status: 409 });
    }

    const previousName = normalizeName(facilitySnapshot.data()?.name);
    await facilityRef.update({
      name,
      normalizedName,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const assignedById = await db
      .collection("users")
      .where("facilityId", "==", id)
      .get();
    const assignedByName = previousName
      ? await db.collection("users").where("facilityName", "==", previousName).get()
      : null;
    const affectedProfiles = new Map([
      ...assignedById.docs,
      ...(assignedByName?.docs ?? []),
    ].map((profile) => [profile.id, profile.ref]));

    const profileRefs = [...affectedProfiles.values()];
    for (let start = 0; start < profileRefs.length; start += 450) {
      const batch = db.batch();
      for (const profileRef of profileRefs.slice(start, start + 450)) {
        batch.update(profileRef, { facilityName: name });
      }
      await batch.commit();
    }

    return Response.json({ facility: { id, name }, updatedProfiles: profileRefs.length });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
    const payload = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!payload || Array.isArray(payload)) {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const id = normalizeName(payload.id);
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
      return Response.json({ error: "Facility ID is invalid." }, { status: 400 });
    }

    const db = getAdminDb();
    const facilityRef = db.collection("facilities").doc(id);
    const facilitySnapshot = await facilityRef.get();
    if (!facilitySnapshot.exists) {
      return Response.json({ error: "Facility was not found." }, { status: 404 });
    }

    const facilityName = normalizeName(facilitySnapshot.data()?.name);
    const assignedById = await db
      .collection("users")
      .where("facilityId", "==", id)
      .limit(1)
      .get();
    const assignedByName = facilityName
      ? await db.collection("users").where("facilityName", "==", facilityName).limit(1).get()
      : null;
    if (!assignedById.empty || (assignedByName && !assignedByName.empty)) {
      return Response.json(
        { error: "This facility is assigned to staff. Reassign them before deleting it." },
        { status: 409 },
      );
    }

    await facilityRef.delete();
    return Response.json({ deleted: true, id });
  } catch (error) {
    return apiError(error);
  }
}
