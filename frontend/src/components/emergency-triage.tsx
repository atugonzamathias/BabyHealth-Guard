"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";

type Alert = {
  id: string;
  motherName: string;
  phone: string;
  symptom: string;
  urgency: string;
  status: string;
  createdAt: string | null;
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

  if (error || !alerts.length) {
    return error ? <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null;
  }

  return (
    <section className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 p-4 shadow-sm" aria-label="Emergency triage">
      <div className="flex items-center gap-2 text-red-900">
        <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-black text-white">CRITICAL</span>
        <h2 className="font-bold">Emergency triage requires attention</h2>
      </div>
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
            <p className="mt-1 text-xs font-bold uppercase text-red-700">{alert.status}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {alert.status === "PENDING_ACTION" && (
                <button className="rounded bg-red-700 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => void update(alert.id, { status: "ACKNOWLEDGED" })} type="button">
                  Acknowledge
                </button>
              )}
              {alert.status === "ACKNOWLEDGED" && (
                <button className="rounded bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => {
                  const notes = window.prompt("Enter clinical resolution notes.");
                  if (notes?.trim()) void update(alert.id, { status: "RESOLVED", referralNotes: notes });
                }} type="button">
                  Resolve
                </button>
              )}
              {alert.status !== "RESOLVED" && (
                <button className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-800" onClick={() => {
                  const notes = window.prompt("Enter referral destination and notes.");
                  if (notes?.trim()) void update(alert.id, { referralSent: true, referralNotes: notes });
                }} type="button">
                  Log referral
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
