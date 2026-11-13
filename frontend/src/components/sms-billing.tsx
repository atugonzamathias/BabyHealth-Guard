"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

type SmsLog = {
  id: string;
  recipient: string;
  message: string;
  category: string;
  status: "accepted" | "failed";
  segmentCount: number;
  cost: number;
  createdAt: string | null;
};

type SmsBillingData = {
  balance: string;
  currency: string | null;
  balanceAmount: number | null;
  estimatedSmsRemaining: number | null;
  totalSent: number;
  totalAttempts: number;
  successful: number;
  failed: number;
  totalSegments: number;
  estimatedCost: number;
  costPerSegment: number;
  smsLogs: SmsLog[];
  page: number;
  pageSize: number;
  totalLogs: number;
  hasMore: boolean;
};

function formatUgx(value: number): string {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "Date not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date not recorded"
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

export function SmsBilling() {
  const [data, setData] = useState<SmsBillingData | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBilling = useCallback(async (requestedPage: number) => {
    const user = auth.currentUser;
    if (!user) {
      setError("Sign in again to view SMS billing.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/admin/sms-billing?page=${requestedPage}&pageSize=25`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      const result = (await response.json().catch(() => null)) as
        | (SmsBillingData & { error?: string })
        | null;
      if (!response.ok) {
        throw new Error(result?.error ?? "Could not load SMS billing information.");
      }
      if (!result) throw new Error("The SMS billing response was invalid.");
      setData(result);
      setPage(requestedPage);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load SMS billing information.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadBilling(1), 0);
    return () => window.clearTimeout(timer);
  }, [loadBilling]);

  const balanceDisplay = data
    ? data.balance
    : isLoading
      ? "Loading…"
      : "Unavailable";

  return (
    <section className="space-y-5 border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">SMS billing &amp; usage</h3>
          <p className="mt-1 text-sm text-slate-600">
            Africa&apos;s Talking wallet balance and estimated message usage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="inline-flex items-center rounded-lg bg-cyan-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-900"
            href="https://account.africastalking.com/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Top up on Africa&apos;s Talking
          </a>
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            disabled={isLoading}
            onClick={() => void loadBilling(page)}
            type="button"
          >
            {isLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Current wallet balance" value={balanceDisplay} />
        <MetricCard
          label="Estimated single-segment SMS remaining"
          value={
            data?.estimatedSmsRemaining == null
              ? "—"
              : data.estimatedSmsRemaining.toLocaleString()
          }
        />
        <MetricCard
          label="Total messages sent"
          value={data ? data.totalSent.toLocaleString() : "—"}
        />
        <MetricCard
          label="Failed messages"
          value={data ? data.failed.toLocaleString() : "—"}
        />
      </div>

      {data && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
          <span>SMS attempts: {data.totalAttempts.toLocaleString()}</span>
          <span>Accepted by provider: {data.successful.toLocaleString()}</span>
          <span>Estimated sent-message cost: {formatUgx(data.estimatedCost)}</span>
          <span>Estimated segments: {data.totalSegments.toLocaleString()}</span>
          <span>Rate: {formatUgx(data.costPerSegment)} per segment</span>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h4 className="font-semibold text-slate-900">Recent SMS activity</h4>
          <p className="mt-1 text-xs text-slate-500">
            Segment costs are estimates. Provider acceptance does not confirm handset delivery.
          </p>
        </div>
        {isLoading && !data ? (
          <p className="p-5 text-sm text-slate-500">Loading wallet and SMS activity…</p>
        ) : data?.smsLogs.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Recipient</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Segments</th>
                    <th className="px-4 py-3 text-right font-semibold">Est. cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.smsLogs.map((log) => (
                    <tr key={`${log.id}-${log.recipient}`}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                        {log.recipient || "Not recorded"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {log.category.replaceAll("_", " ")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            log.status === "accepted"
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-rose-50 text-rose-800"
                          }`}
                        >
                          {log.status === "accepted" ? "Success" : "Failed"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {log.segmentCount}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-800">
                        {formatUgx(log.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-500">
                Page {data.page} · {data.totalLogs.toLocaleString()} total messages
              </p>
              <div className="flex gap-2">
                <button
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                  disabled={isLoading || page <= 1}
                  onClick={() => void loadBilling(page - 1)}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                  disabled={isLoading || !data.hasMore}
                  onClick={() => void loadBilling(page + 1)}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="p-5 text-sm text-slate-500">
            No outbound SMS activity has been recorded yet.
          </p>
        )}
      </section>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 break-words text-xl font-bold text-slate-900">{value}</p>
    </article>
  );
}
