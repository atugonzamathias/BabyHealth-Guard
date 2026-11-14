"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

type UssdRequest = {
  id: string;
  motherName: string;
  phone: string;
  clinic: string;
  requestType: string;
  appointmentType: string;
  preferredWindow: string;
  createdAt: string | null;
};

type ApprovalForm = {
  type: string;
  scheduledAt: string;
  clinic: string;
  agenda: string;
  reminderEnabled: boolean;
  reminderMinutes: number;
};

function defaultDate(): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
}

export function UssdRequests() {
  const [requests, setRequests] = useState<UssdRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState("");
  const [selected, setSelected] = useState<UssdRequest | null>(null);
  const [approval, setApproval] = useState<ApprovalForm>({
    type: "ANTENATAL",
    scheduledAt: defaultDate(),
    clinic: "",
    agenda: "",
    reminderEnabled: true,
    reminderMinutes: 60,
  });
  const [declineReason, setDeclineReason] = useState("");
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
    try {
      const response = await fetch("/api/admin/ussd-requests", {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        cache: "no-store",
      });
      const result = (await response.json().catch(() => null)) as
        | { requests?: UssdRequest[]; error?: string }
        | null;
      if (!response.ok) throw new Error(result?.error ?? "Could not load USSD requests.");
      setRequests(result?.requests ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load USSD requests.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRequests(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRequests]);

  function openApproval(entry: UssdRequest) {
    setSelected(entry);
    setApproval({
      type: entry.appointmentType || "ANTENATAL",
      scheduledAt: defaultDate(),
      clinic: entry.clinic,
      agenda: entry.requestType === "reschedule" ? "Rescheduled visit requested by mother via USSD." : "",
      reminderEnabled: true,
      reminderMinutes: 60,
    });
    setError("");
  }

  async function approve() {
    if (!selected) return;
    const user = auth.currentUser;
    if (!user) return setError("Sign in again to approve requests.");
    setPendingId(selected.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/ussd-requests/${selected.id}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(approval),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Could not schedule the visit.");
      setRequests((current) => current.filter((entry) => entry.id !== selected.id));
      setSelected(null);
      setNotice("Visit scheduled and confirmation SMS sent.");
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : "Could not schedule the visit.");
    } finally {
      setPendingId("");
    }
  }

  async function decline() {
    if (!selected || !declineReason.trim()) {
      setError("Enter a reason before declining the request.");
      return;
    }
    const user = auth.currentUser;
    if (!user) return setError("Sign in again to decline requests.");
    setPendingId(selected.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/ussd-requests/${selected.id}/decline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: declineReason }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Could not decline the request.");
      setRequests((current) => current.filter((entry) => entry.id !== selected.id));
      setSelected(null);
      setDeclineReason("");
      setNotice("Request declined and the mother was notified.");
    } catch (declineError) {
      setError(declineError instanceof Error ? declineError.message : "Could not decline the request.");
    } finally {
      setPendingId("");
    }
  }

  return (
    <section className="space-y-4 border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">USSD visit requests</h3>
          <p className="mt-1 text-sm text-slate-600">Approve and schedule visits or decline them with a reason.</p>
        </div>
        <button className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60" disabled={isLoading} onClick={() => void loadRequests()} type="button">
          {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
      {notice && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</p>}
      {requests.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">{isLoading ? "Loading pending requests…" : "There are no pending USSD visit requests."}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Mother</th><th className="px-4 py-3">Visit type</th><th className="px-4 py-3">Preferred time</th><th className="px-4 py-3">Facility</th><th className="px-4 py-3">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3"><p className="font-medium">{entry.motherName}</p><p className="text-xs text-slate-500">{entry.phone}</p></td>
                  <td className="px-4 py-3">{entry.appointmentType || "Not specified"}</td>
                  <td className="px-4 py-3">{entry.preferredWindow || "Not specified"}</td>
                  <td className="px-4 py-3">{entry.clinic || "Not assigned"}</td>
                  <td className="px-4 py-3"><button className="rounded-md bg-cyan-800 px-3 py-1.5 text-xs font-semibold text-white" disabled={pendingId !== ""} onClick={() => openApproval(entry)} type="button">Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-5">
          <h4 className="font-bold text-slate-900">Review {selected.motherName}&apos;s request</h4>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Visit type<select className="mt-1 w-full rounded border p-2 font-normal" value={approval.type} onChange={(event) => setApproval({ ...approval, type: event.target.value })}><option value="ANTENATAL">Antenatal</option><option value="DELIVERY">Delivery</option><option value="POSTNATAL">Postnatal</option><option value="IMMUNIZATION">Immunization</option></select></label>
            <label className="text-sm font-semibold">Date and time<input className="mt-1 w-full rounded border p-2 font-normal" type="datetime-local" value={approval.scheduledAt} onChange={(event) => setApproval({ ...approval, scheduledAt: event.target.value })} /></label>
            <label className="text-sm font-semibold">Clinic<input className="mt-1 w-full rounded border p-2 font-normal" value={approval.clinic} onChange={(event) => setApproval({ ...approval, clinic: event.target.value })} /></label>
            <label className="text-sm font-semibold">Agenda<input className="mt-1 w-full rounded border p-2 font-normal" value={approval.agenda} onChange={(event) => setApproval({ ...approval, agenda: event.target.value })} /></label>
            <label className="flex items-center gap-2 text-sm font-semibold"><input checked={approval.reminderEnabled} onChange={(event) => setApproval({ ...approval, reminderEnabled: event.target.checked })} type="checkbox" /> Enable reminder SMS</label>
            {approval.reminderEnabled && <label className="text-sm font-semibold">Reminder<select className="mt-1 w-full rounded border p-2 font-normal" value={approval.reminderMinutes} onChange={(event) => setApproval({ ...approval, reminderMinutes: Number(event.target.value) })}><option value={5}>5 minutes before</option><option value={30}>30 minutes before</option><option value={60}>1 hour before</option><option value={720}>12 hours before</option><option value={1440}>1 day before</option></select></label>}
          </div>
          <p className="mt-3 text-xs text-slate-600">The mother name, phone, and confirmation SMS are automatic. The mother&apos;s requested visit type is prefilled.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="rounded bg-cyan-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={pendingId !== ""} onClick={() => void approve()} type="button">Approve &amp; schedule</button>
            <input className="min-w-64 flex-1 rounded border p-2 text-sm" placeholder="Reason for declining" value={declineReason} onChange={(event) => setDeclineReason(event.target.value)} />
            <button className="rounded border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-60" disabled={pendingId !== ""} onClick={() => void decline()} type="button">Decline &amp; notify</button>
            <button className="rounded border px-4 py-2 text-sm" onClick={() => setSelected(null)} type="button">Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
