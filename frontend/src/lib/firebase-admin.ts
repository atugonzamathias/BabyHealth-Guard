import "server-only";
import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function getAdminApp() {
  const existing = getApps().find((candidate) => candidate.name === "babyhealth-server");
  if (existing) return existing;

  const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  const serviceAccountFile = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_FILE;
  if (!serviceAccountJson && !serviceAccountFile) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_SERVICE_ACCOUNT or FIREBASE_ADMIN_SERVICE_ACCOUNT_FILE.",
    );
  }

  let credentials: {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };
  try {
    const rawCredentials = serviceAccountFile
      ? readFileSync(serviceAccountFile, "utf8")
      : serviceAccountJson;
    credentials = JSON.parse(rawCredentials ?? "") as typeof credentials;
  } catch (error) {
    if (
      serviceAccountFile &&
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_FILE does not point to a readable service-account JSON file.");
    }
    throw new Error(
      serviceAccountFile
        ? "Firebase Admin service-account file must contain valid JSON."
        : "FIREBASE_ADMIN_SERVICE_ACCOUNT must contain valid JSON.",
    );
  }
  if (!credentials.project_id || !credentials.client_email || !credentials.private_key) {
    throw new Error("Firebase Admin service-account JSON is missing required fields.");
  }
  const webProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (webProjectId && credentials.project_id !== webProjectId) {
    throw new Error(
      "Firebase Admin service account project_id does not match NEXT_PUBLIC_FIREBASE_PROJECT_ID.",
    );
  }

  return initializeApp(
    {
      credential: cert({
        projectId: credentials.project_id,
        clientEmail: credentials.client_email,
        privateKey: credentials.private_key.replace(/\\n/g, "\n"),
      }),
    },
    "babyhealth-server",
  );
}

let firestore: ReturnType<typeof getFirestore> | undefined;

export function getAdminDb() {
  firestore ??= getFirestore(getAdminApp());
  return firestore;
}
