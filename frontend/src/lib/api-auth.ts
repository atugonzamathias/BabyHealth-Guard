import "server-only";
import { getAuth } from "firebase-admin/auth";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminApp, getAdminDb } from "@/lib/firebase-admin";

export const STAFF_ROLES = new Set([
  "doctor",
  "admin",
  "system_admin",
  "health_worker",
  "health worker",
  "nurse",
  "midwife",
]);

export const ADMIN_ROLES = new Set(["admin", "system_admin"]);

export type StaffContext = {
  uid: string;
  token: DecodedIdToken;
  role: string;
  facilityId: string;
  facilityName: string;
  isSystemAdmin: boolean;
};

export class ApiAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRole(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function getErrorCode(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return "";
}

export async function requireStaffContext(request: Request): Promise<StaffContext> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) throw new ApiAuthError("Sign in with an approved staff account.", 401);

  let adminApp: ReturnType<typeof getAdminApp>;
  try {
    adminApp = getAdminApp();
  } catch (error) {
    console.error("Firebase Admin initialization failed", error);
    throw new ApiAuthError(
      "Server-side Firebase Admin is not configured. Set FIREBASE_ADMIN_SERVICE_ACCOUNT and restart the frontend server.",
      503,
    );
  }

  let token: DecodedIdToken;
  try {
    token = await getAuth(adminApp).verifyIdToken(match[1]);
  } catch (error) {
    const code = getErrorCode(error);
    if (
      code === "auth/id-token-expired" ||
      code === "auth/id-token-revoked" ||
      code === "auth/invalid-id-token" ||
      code === "auth/argument-error"
    ) {
      throw new ApiAuthError("Your sign-in is invalid or has expired. Sign in again.", 401);
    }
    console.error("Firebase ID token verification failed", error);
    throw new ApiAuthError(
      "Firebase could not verify this sign-in. Check the server-side Firebase project configuration.",
      503,
    );
  }

  const profile = await getAdminDb().doc(`users/${token.uid}`).get();
  const profileData = profile.data() ?? {};
  const role = normalizeRole(profileData.role);
  if (!profile.exists || !STAFF_ROLES.has(role)) {
    throw new ApiAuthError("An approved staff account is required.", 403);
  }

  const facilityId = normalizeText(profileData.facilityId);
  const facilityName = normalizeText(profileData.facilityName);
  if (!facilityId || !facilityName) {
    throw new ApiAuthError(
      "This staff account is missing a valid facility assignment. Contact your administrator.",
      403,
    );
  }

  return {
    uid: token.uid,
    token,
    role,
    facilityId,
    facilityName,
    isSystemAdmin: role === "system_admin",
  };
}

export async function requireStaff(request: Request): Promise<StaffContext> {
  return requireStaffContext(request);
}

export async function requireAdminContext(request: Request): Promise<StaffContext> {
  const context = await requireStaffContext(request);
  if (!ADMIN_ROLES.has(context.role)) {
    throw new ApiAuthError("Administrator access is required.", 403);
  }
  return context;
}

export async function requireAdmin(request: Request): Promise<StaffContext> {
  return requireAdminContext(request);
}

export async function getMotherInStaffFacility(
  motherUid: string,
  context: Pick<StaffContext, "facilityId" | "isSystemAdmin">,
): Promise<Record<string, unknown>> {
  const snapshot = await getAdminDb().doc(`users/${motherUid}`).get();
  if (!snapshot.exists) {
    throw new ApiAuthError("Mother profile was not found.", 404);
  }

  const data = snapshot.data() ?? {};
  const motherRole = normalizeRole(data.role);
  if (motherRole !== "mother") {
    throw new ApiAuthError("Mother profile was not found.", 404);
  }

  const motherFacilityId = normalizeText(data.facilityId);
  if (!context.isSystemAdmin && motherFacilityId !== context.facilityId) {
    throw new ApiAuthError("This mother record is outside your facility.", 403);
  }
  if (!motherFacilityId) {
    throw new ApiAuthError("This mother record is missing a facility assignment.", 403);
  }

  return data;
}

export function assertMotherFacility(
  mother: Record<string, unknown> | undefined,
  context: Pick<StaffContext, "facilityId" | "isSystemAdmin">,
): Record<string, unknown> {
  if (!mother) {
    throw new ApiAuthError("Mother profile was not found.", 404);
  }

  const motherRole = normalizeRole(mother.role);
  if (motherRole !== "mother") {
    throw new ApiAuthError("Mother profile was not found.", 404);
  }

  const motherFacilityId = normalizeText(mother.facilityId);
  if (!context.isSystemAdmin && motherFacilityId !== context.facilityId) {
    throw new ApiAuthError("This mother record is outside your facility.", 403);
  }
  if (!motherFacilityId) {
    throw new ApiAuthError("This mother record is missing a facility assignment.", 403);
  }

  return mother;
}

export function apiError(error: unknown): Response {
  if (error instanceof ApiAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("Authenticated API request failed", error);
  return Response.json({ error: "The request could not be completed." }, { status: 500 });
}