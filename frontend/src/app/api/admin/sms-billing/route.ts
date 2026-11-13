import { Timestamp, type DocumentData, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { apiError, ApiAuthError, requireAdmin } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  estimateSmsCost,
  SMS_COST_PER_SEGMENT_UGX,
  smsSegmentCount,
} from "@/lib/sms-metrics";

export const runtime = "nodejs";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function currencyBalance(value: unknown): {
  balance: string;
  balanceAmount: number | null;
  currency: string | null;
} {
  const balance = text(value);
  const match = /([A-Z]{3})\s*([-+]?[\d,]+(?:\.\d+)?)/i.exec(balance);
  if (!match) return { balance, balanceAmount: null, currency: null };
  const balanceAmount = Number(match[2].replaceAll(",", ""));
  return {
    balance,
    balanceAmount: Number.isFinite(balanceAmount) ? balanceAmount : null,
    currency: match[1].toUpperCase(),
  };
}

function timestampMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function mapSmsLog(snapshot: QueryDocumentSnapshot<DocumentData>) {
  const data = snapshot.data();
  const motherUid =
    text(data.motherUid) ||
    (snapshot.ref.parent.parent?.id ?? "");
  const status = text(data.status).toLowerCase();
  if (!motherUid || !["accepted", "success", "sent", "delivered", "failed"].includes(status)) {
    return null;
  }
  if (text(data.direction) && text(data.direction).toLowerCase() !== "outbound") {
    return null;
  }

  const message = text(data.message);
  const normalizedStatus = status === "failed" ? "failed" : "accepted";
  const storedCost = typeof data.cost === "number" ? data.cost : null;
  const cost = storedCost ?? estimateSmsCost(message, normalizedStatus);
  return {
    id: snapshot.id,
    motherUid,
    recipient: text(data.recipient),
    message,
    category: text(data.category) || "staff_message",
    status: normalizedStatus,
    segmentCount:
      typeof data.segmentCount === "number"
        ? data.segmentCount
        : smsSegmentCount(message),
    cost,
    providerMessageId: text(data.providerMessageId) || null,
    createdAt: timestampMillis(data.createdAt),
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const apiKey = process.env.AFRICASTALKING_API_KEY?.trim();
    const username = process.env.AFRICASTALKING_USERNAME?.trim();
    if (!apiKey || !username) {
      throw new ApiAuthError(
        "Africa's Talking wallet access is not configured on the server.",
        503,
      );
    }

    const url = new URL(request.url);
    const requestedPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
    const requestedPageSize = Number.parseInt(
      url.searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
      10,
    );
    const page =
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize =
      Number.isInteger(requestedPageSize) && requestedPageSize > 0
        ? Math.min(requestedPageSize, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;

    const balanceUrl = new URL("https://api.africastalking.com/version1/user");
    balanceUrl.searchParams.set("username", username);
    const [balanceResponse, globalLogs, legacyLogs] = await Promise.all([
      fetch(balanceUrl, {
        headers: { Accept: "application/json", apiKey },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      }).catch((error: unknown) => {
        console.error("Could not reach Africa's Talking balance API", error);
        throw new ApiAuthError(
          "Could not reach Africa's Talking to retrieve the wallet balance. Try refreshing.",
          502,
        );
      }),
      getAdminDb().collection("sms_logs").get(),
      getAdminDb().collectionGroup("smsLogs").get(),
    ]);

    const balancePayload = (await balanceResponse.json().catch(() => null)) as
      | { UserData?: { balance?: unknown }; balance?: unknown }
      | null;
    if (!balanceResponse.ok) {
      console.error("Africa's Talking balance request failed", balanceResponse.status);
      throw new ApiAuthError(
        "Could not retrieve the Africa's Talking wallet balance. Check the server credentials and try again.",
        502,
      );
    }

    const rawBalance = balancePayload?.UserData?.balance ?? balancePayload?.balance;
    if (typeof rawBalance !== "string" || !rawBalance.trim()) {
      throw new ApiAuthError(
        "Africa's Talking returned an unrecognized wallet balance response.",
        502,
      );
    }
    const wallet = currencyBalance(rawBalance);

    const deduplicated = new Map<string, NonNullable<ReturnType<typeof mapSmsLog>>>();
    for (const snapshot of [...legacyLogs.docs, ...globalLogs.docs]) {
      const log = mapSmsLog(snapshot);
      if (log) deduplicated.set(`${log.motherUid}:${log.id}`, log);
    }

    const logs = [...deduplicated.values()].sort(
      (left, right) => right.createdAt - left.createdAt,
    );
    const successful = logs.filter((log) => log.status === "accepted");
    const failed = logs.filter((log) => log.status === "failed");
    const estimatedCost = successful.reduce((total, log) => total + log.cost, 0);
    const totalSegments = successful.reduce(
      (total, log) => total + log.segmentCount,
      0,
    );
    const start = (page - 1) * pageSize;
    const pageLogs = logs.slice(start, start + pageSize);
    const missingRecipientUids = [
      ...new Set(
        pageLogs
          .filter((log) => !log.recipient)
          .map((log) => log.motherUid),
      ),
    ];
    const recipientProfiles = await Promise.all(
      missingRecipientUids.map(async (uid) => {
        const snapshot = await getAdminDb().doc(`users/${uid}`).get();
        return [
          uid,
          text(snapshot.data()?.phone) || text(snapshot.data()?.phoneNumber),
        ] as const;
      }),
    );
    const recipientByUid = new Map(recipientProfiles);
    const recentLogs = pageLogs.map((log) => ({
      id: log.id,
      recipient: log.recipient || recipientByUid.get(log.motherUid) || "",
      category: log.category,
      status: log.status,
      segmentCount: log.segmentCount,
      cost: log.cost,
      createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : null,
    }));

    return Response.json({
      ...wallet,
      estimatedSmsRemaining:
        wallet.currency === "UGX" && wallet.balanceAmount !== null
          ? Math.max(
              0,
              Math.floor(wallet.balanceAmount / SMS_COST_PER_SEGMENT_UGX),
            )
          : null,
      totalSent: successful.length,
      totalAttempts: logs.length,
      successful: successful.length,
      failed: failed.length,
      totalSegments,
      estimatedCost,
      costPerSegment: SMS_COST_PER_SEGMENT_UGX,
      smsLogs: recentLogs,
      page,
      pageSize,
      totalLogs: logs.length,
      hasMore: start + pageSize < logs.length,
    });
  } catch (error) {
    return apiError(error);
  }
}
