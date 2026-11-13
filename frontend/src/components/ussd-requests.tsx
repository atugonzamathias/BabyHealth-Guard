"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

type UssdRequest = {
  id: string;
  motherName: string;
  phone: string;
  clinic: string;
  requestType: "new" | "reschedule" | string;
  preferredWindow: string;
  createdAt: string | null;
};

function displayDate(value: string | null): string {
  if (!value) return "Time not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Time not recorded"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function UssdRequests() {
  const [requests, setRequests] = useState<UssdRequest[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequests = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setError("Sign in again to view USSD requests.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/ussd-requests", {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
      });
      const result = (await response.json().catch(() => null)) as
        | { requests?: UssdRequest[]; hasMore?: boolean; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(result?.error ?? "Could not load USSD requests.");
      }
      setRequests(result?.requests ?? []);
      setHasMore(result?.hasMore ?? false);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load USSD requests.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRequests(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRequests]);

  async function updateRequest(requestId: string, status: "reviewed" | "declined") {
    const user = auth.currentUser;
    if (!user) {
      setError("Sign in again to update USSD requests.");
      return;
    }
    setPendingId(requestId);
    setError("");
    setNotice("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/ussd-requests", {
        method: "PATCH",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId, status }),
      });
      const result = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(result?.error ?? "Could not update this USSD request.");
      }
      setRequests((current) => current.filter((entry) => entry.id !== requestId));
      setNotice(status === "reviewed" ? "Request marked as reviewed." : "Request declined.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update this USSD request.",
      );
    } finally {
      setPendingId("");
    }
  }

  return (
    <section className="space-y-4 border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">USSD visit requests</h3>
          <p className="mt-1 text-sm text-slate-600">
            Review new visit and reschedule requests submitted from the Africa&apos;s Talking code.
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          disabled={isLoading}
          onClick={() => void loadRequests()}
          type="button"
        >
          {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
          {notice}
        </p>
      )}
      {isLoading && requests.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Loading pending requests…
        </p>
      ) : requests.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          There are no pending USSD visit requests.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Mother</th>
                <th className="px-4 py-3 font-semibold">Request</th>
                <th className="px-4 py-3 font-semibold">Preferred time</th>
                <th className="px-4 py-3 font-semibold">Facility</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{entry.motherName}</p>
                    <p className="text-xs text-slate-500">{entry.phone || "No phone recorded"}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 capitalize text-slate-700">
                    {entry.requestType === "reschedule" ? "Reschedule visit" : "New visit"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {entry.preferredWindow || "Not specified"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{entry.clinic || "Not assigned"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {displayDate(entry.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        className="rounded-md bg-cyan-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        disabled={pendingId !== ""}
                        onClick={() => void updateRequest(entry.id, "reviewed")}
                        type="button"
                      >
                        {pendingId === entry.id ? "Saving…" : "Mark reviewed"}
                      </button>
                      <button
                        className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60"
                        disabled={pendingId !== ""}
                        onClick={() => void updateRequest(entry.id, "declined")}
                        type="button"
                      >
                        Decline
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hasMore && (
        <p className="text-xs text-slate-500">Showing the latest 100 pending requests.</p>
      )}
    </section>
  );
}
