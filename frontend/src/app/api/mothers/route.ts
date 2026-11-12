import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { apiError, requireStaff } from "@/lib/api-auth";
import { getAdminApp, getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const LANGUAGES = new Set(["Luganda", "English", "Swahili"]);
const MATERNAL_STATUSES = new Set(["expecting", "baby"]);
const PREGNANCY_STAGES = new Set(["1 - 3 Mo", "4 - 6 Mo", "7 - 9 Mo"]);
const PARITIES = new Set(["First Baby (1st)", "2nd or More"]);
const CONDITIONS = new Set(["None", "High BP", "Anemia", "Other"]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const { uid: staffUid } = await requireStaff(request);
    const payload = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!payload || Array.isArray(payload)) {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const fullName = text(payload.fullName);
    const email = text(payload.email).toLowerCase();
    const age = payload.age;
    const village = text(payload.village);
    const phoneDigits = text(payload.phone).replace(/\s/g, "");
    const language = text(payload.language);
    const maternalStatus = text(payload.maternalStatus);
    const pregnancyStage = text(payload.pregnancyStage);
    const parity = text(payload.parity);
    const conditions = Array.isArray(payload.conditions)
      ? payload.conditions.filter((value): value is string => typeof value === "string")
      : [];
    const midwifeUid = text(payload.midwifeUid);

    if (
      !fullName ||
      fullName.length > 120 ||
      !Number.isInteger(age) ||
      (age as number) < 10 ||
      (age as number) > 120 ||
      !village ||
      village.length > 120 ||
      !/^\d{9}$/.test(phoneDigits) ||
      (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
      (email && email.length > 254) ||
      !LANGUAGES.has(language) ||
      !MATERNAL_STATUSES.has(maternalStatus) ||
      (maternalStatus === "expecting" && !PREGNANCY_STAGES.has(pregnancyStage)) ||
      (maternalStatus === "baby" && pregnancyStage !== "") ||
      !PARITIES.has(parity) ||
      conditions.length === 0 ||
      conditions.some((condition) => !CONDITIONS.has(condition)) ||
      (conditions.includes("None") && conditions.length > 1) ||
      (midwifeUid && !/^[A-Za-z0-9_-]{1,128}$/.test(midwifeUid))
    ) {
      return Response.json({ error: "Mother profile details are invalid." }, { status: 400 });
    }

    const db = getAdminDb();
    const staffProfile = await db.doc(`users/${staffUid}`).get();
    const facilityName = text(staffProfile.data()?.facilityName);
    let midwifeName = "";
    let midwifePhone = "";
    if (midwifeUid) {
      const midwifeProfile = await db.doc(`users/${midwifeUid}`).get();
      const isDisabled = midwifeProfile.data()?.disabled === true ||
        (await getAuth(getAdminApp()).getUser(midwifeUid)).disabled;
      if (!midwifeProfile.exists || midwifeProfile.data()?.role !== "midwife" || isDisabled) {
        return Response.json({ error: "Selected midwife is no longer active. Refresh the list." }, { status: 400 });
      }
      midwifeName = text(midwifeProfile.data()?.fullName);
      midwifePhone = text(midwifeProfile.data()?.phone);
      if (!midwifeName) {
        return Response.json({ error: "Selected midwife profile has no name." }, { status: 400 });
      }
    }
    const profileRef = db.collection("users").doc();
    const profile = {
      fullName,
      email,
      age,
      village,
      phone: `+256 ${phoneDigits}`,
      language,
      maternalStatus,
      pregnancyStage,
      parity,
      conditions: [...new Set(conditions)],
      role: "mother",
      midwifeName,
      midwifePhone,
      facilityName,
      createdBy: staffUid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await profileRef.create(profile);

    return Response.json({ uid: profileRef.id, ...profile, created: true }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
