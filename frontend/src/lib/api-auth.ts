import "server-only";
import { getAuth } from "firebase-admin/auth";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminApp, getAdminDb } from "@/lib/firebase-admin";

export const STAFF_ROLES = new Set([
  "doctor",
  "admin",
  "health_worker",
  "health worker",
  "nurse",
  "midwife",
]);

export class ApiAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
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

export async function requireStaff(request: Request): Promise<{
  uid: string;
  token: DecodedIdToken;
}> {
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
  const role =
    typeof profile.data()?.role === "string"
      ? String(profile.data()?.role).trim().toLowerCase()
      : "";
  if (!profile.exists || !STAFF_ROLES.has(role)) {
    throw new ApiAuthError("An approved staff account is required.", 403);
  }
  return { uid: token.uid, token };
}

export async function requireAdmin(request: Request): Promise<{
  uid: string;
  token: DecodedIdToken;
}> {
  const { uid, token } = await requireStaff(request);
  const profile = await getAdminDb().doc(`users/${uid}`).get();
  const role =
    typeof profile.data()?.role === "string"
      ? String(profile.data()?.role).trim().toLowerCase()
      : "";
  if (!profile.exists || role !== "admin") {
    throw new ApiAuthError("Administrator access is required.", 403);
  }
  return { uid, token };
}

export function apiError(error: unknown): Response {
  if (error instanceof ApiAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("Authenticated API request failed", error);
  return Response.json({ error: "The request could not be completed." }, { status: 500 });
}
