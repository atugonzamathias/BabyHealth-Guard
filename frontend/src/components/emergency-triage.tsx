"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";

type Alert = {
  id: string;
  motherName: string;
  phone: string;
  symptom: string;
  urgency: string;
  status: string;
  referredToFacility?: string;
  createdAt: string | null;
};

type ReferralForm = {
  referredToFacility: string;
  transportPhone: string;
  referralNotes: string;
  notifyMother: boolean;
};

const EMPTY_REFERRAL: ReferralForm = {
  referredToFacility: "",
  transportPhone: "",
  referralNotes: "",
  notifyMother: true,
};

function elapsed(value: string | null): string {
  if (!value) return "just now";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

export function EmergencyTriage({ user }: { user: User }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [referral, setReferral] = useState<ReferralForm>(EMPTY_REFERRAL);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/danger-signs", {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Could not load emergency alerts.");
      setAlerts((await response.json()).alerts ?? []);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load emergency alerts.");
    }
  }, [user]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 30000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [load]);

  async function update(id: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/admin/danger-signs/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || "Could not update emergency alert.");
    }
    await load();
  }

  async function submitReferral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAlert) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/danger-signs/${selectedAlert.id}/refer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify(referral),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Could not log referral.");
      setSelectedAlert(null);
      setReferral(EMPTY_REFERRAL);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not log referral.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !alerts.length) {
    return <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>;
  }
  if (!alerts.length) return null;

  return (
    <>
      <section className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 p-4 shadow-sm" aria-label="Emergency triage">
        <div className="flex items-center gap-2 text-red-900">
          <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-black text-white">CRITICAL</span>
          <h2 className="font-bold">Emergency triage requires attention</h2>
        </div>
        {error && <p className="mt-3 rounded-lg bg-rose-100 p-3 text-sm text-rose-800">{error}</p>}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {alerts.map((alert) => (
            <article className="rounded-lg border border-red-200 bg-white p-3" key={alert.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{alert.motherName}</p>
                  <a className="text-sm font-semibold text-red-700 underline" href={`tel:${alert.phone}`}>{alert.phone}</a>
                </div>
                <span className="text-xs font-semibold text-slate-500">{elapsed(alert.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{alert.symptom}</p>
              <p className="mt-1 text-xs font-bold uppercase text-red-700">
                {alert.status === "REFERRED" ? `REFERRED → ${alert.referredToFacility}` : alert.status}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {alert.status === "PENDING_ACTION" && (
                  <button className="rounded bg-red-700 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => void update(alert.id, { status: "ACKNOWLEDGED" })} type="button">
                    Acknowledge
                  </button>
                )}
                {alert.status !== "REFERRED" && (
                  <button className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-800" onClick={() => {
                    setSelectedAlert(alert);
                    setReferral(EMPTY_REFERRAL);
                  }} type="button">
                    Log referral
                  </button>
                )}
                <button className="rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => {
                  const notes = window.prompt("Enter clinical resolution notes.");
                  if (notes?.trim()) void update(alert.id, { status: "RESOLVED", referralNotes: notes });
                }} type="button">
                  Resolve
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedAlert && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="referral-title">
          <form className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl" onSubmit={(event) => void submitReferral(event)}>
            <div>
              <h2 className="text-lg font-bold text-slate-900" id="referral-title">Log clinical referral</h2>
              <p className="mt-1 text-sm text-slate-600">{selectedAlert.motherName} · {selectedAlert.symptom}</p>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Receiving facility
              <input className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" required value={referral.referredToFacility} onChange={(event) => setReferral({ ...referral, referredToFacility: event.target.value })} placeholder="Kawempe National Referral Hospital" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Emergency transport / receiving desk phone
              <input className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" value={referral.transportPhone} onChange={(event) => setReferral({ ...referral, transportPhone: event.target.value })} placeholder="+256 700 000 000" inputMode="tel" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Clinical referral notes
              <textarea className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5" required rows={4} value={referral.referralNotes} onChange={(event) => setReferral({ ...referral, referralNotes: event.target.value })} placeholder="Active heavy vaginal bleeding, urgent obstetric review required" />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input checked={referral.notifyMother} onChange={(event) => setReferral({ ...referral, notifyMother: event.target.checked })} type="checkbox" />
              Notify mother via SMS
            </label>
            <div className="flex justify-end gap-2">
              <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => setSelectedAlert(null)} type="button">Cancel</button>
              <button className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving…" : "Save referral"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
