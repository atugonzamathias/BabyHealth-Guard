import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function value(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function isSuccessful(status: string): boolean {
  return ["success", "delivered", "sent"].includes(status.toLowerCase());
}

export async function POST(request: Request) {
  const secret = process.env.SMS_DELIVERY_CALLBACK_SECRET?.trim();
  const url = new URL(request.url);
  if (!secret || url.searchParams.get("token") !== secret) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  let payload: Record<string, unknown> = {};
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    if (body && typeof body === "object" && !Array.isArray(body)) {
      payload = body as Record<string, unknown>;
    }
  } else {
    const form = await request.formData();
    form.forEach((entry, key) => {
      if (typeof entry === "string") payload[key] = entry;
    });
  }

  const providerMessageId =
    value(payload.id) || value(payload.messageId) || value(payload.message_id);
  const providerStatus = value(payload.status) || value(payload.deliveryStatus);
  if (!providerMessageId || !providerStatus) {
    return Response.json({ error: "Message ID and delivery status are required." }, { status: 400 });
  }

  const db = getAdminDb();
  const snapshots = await Promise.all([
    db.collection("sms_logs").where("providerMessageId", "==", providerMessageId).get(),
    db.collectionGroup("smsLogs").where("providerMessageId", "==", providerMessageId).get(),
  ]);
  const logs = snapshots.flatMap((snapshot) => snapshot.docs);
  if (logs.length === 0) {
    return Response.json({ updated: false });
  }

  const delivered = isSuccessful(providerStatus);
  const status = delivered ? "accepted" : "failed";
  const batch = db.batch();
  for (const log of logs) {
    batch.update(log.ref, {
      status,
      deliveryStatus: providerStatus.toLowerCase(),
      providerStatus,
      providerMessageId,
      ...(payload.cost ? { providerCost: value(payload.cost) } : {}),
      deliveryUpdatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  return Response.json({ updated: true, status, deliveryStatus: providerStatus });
}
