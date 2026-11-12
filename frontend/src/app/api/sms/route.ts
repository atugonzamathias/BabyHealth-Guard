import { apiError, requireStaff } from "@/lib/api-auth";
import { sendSmsToMother } from "@/lib/sms-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { uid } = await requireStaff(request);
    const payload = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!payload || Array.isArray(payload)) {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    const motherUid = typeof payload.motherUid === "string" ? payload.motherUid.trim() : "";
    const message = typeof payload.message === "string" ? payload.message.trim() : "";
    const category =
      typeof payload.category === "string"
        ? payload.category.trim().slice(0, 40)
        : "staff_message";
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(motherUid) || !message || message.length > 480) {
      return Response.json(
        { error: "Choose a mother and provide a message of 1–480 characters." },
        { status: 400 },
      );
    }
    if (payload.consentConfirmed !== true) {
      return Response.json(
        { error: "Confirm the mother's consent before sending an SMS." },
        { status: 400 },
      );
    }

    const result = await sendSmsToMother({
      motherUid,
      message,
      category,
      sentBy: uid,
      consentConfirmed: true,
    });
    return Response.json({
      accepted: result.status === "accepted",
      status: result.status,
      providerMessageId: result.providerMessageId ?? null,
    });
  } catch (error) {
    return apiError(error);
  }
}
