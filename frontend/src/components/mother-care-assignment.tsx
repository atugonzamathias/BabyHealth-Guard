"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { auth } from "@/lib/firebase";
import type { MotherProfile } from "@/lib/care-data";

type AssignableStaff = {
  uid: string;
  fullName: string;
  phone: string;
  role: string;
  facilityName: string;
};

async function requestAssignment<T>(
  method: "GET" | "PATCH",
  payload?: Record<string, string>,
): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in again to manage mother assignments.");
  const token = await user.getIdToken();

  const response = await fetch("/api/admin/mother-assignment", {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(payload ? { "Content-Type": "application/json" } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
    cache: "no-store",
  });
  const result = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(result.error ?? "Could not update the care-team assignment.");
  }
  return result;
}

export function MotherCareAssignment({ mother }: { mother: MotherProfile }) {
  const [staff, setStaff] = useState<AssignableStaff[]>([]);
  const [staffUid, setStaffUid] = useState(mother.assignedStaffUid ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchStaff = useCallback(async () => {
    const result = await requestAssignment<{ staff?: AssignableStaff[] }>("GET");
    return result.staff ?? [];
  }, []);

  useEffect(() => {
    let active = true;
    fetchStaff()
      .then((members) => {
        if (active) setStaff(members);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load active staff members.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchStaff]);

  async function loadStaff() {
    setLoading(true);
    setError("");
    try {
      setStaff(await fetchStaff());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load active staff members.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!staffUid) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await requestAssignment("PATCH", {
        motherUid: mother.uid,
        staffUid,
      });
      setNotice("Care-team member assigned. Their phone number is now available to the mother.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not assign the selected staff member.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function clearAssignment() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await requestAssignment("PATCH", {
        motherUid: mother.uid,
        staffUid: "",
      });
      setStaffUid("");
      setNotice("Assigned care-team member removed.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not remove the staff assignment.",
      );
    } finally {
      setSaving(false);
    }
  }

  const assignedContactName =
    mother.assignedStaffName || mother.midwifeName || "";
  const assignedContactPhone =
    mother.assignedStaffPhone || mother.midwifePhone || "";

  return (
    <section className="mt-5 rounded-xl border border-cyan-100 bg-cyan-50/60 p-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Assigned care-team contact</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          The mother&apos;s mobile app uses this staff member&apos;s phone for its call
          and SMS buttons.
        </p>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-slate-500">Current contact</dt>
          <dd className="mt-0.5 font-semibold text-slate-800">
            {assignedContactName || "No care-team contact assigned"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Phone number</dt>
          <dd className="mt-0.5 font-semibold text-slate-800">
            {assignedContactPhone || "Not recorded"}
          </dd>
        </div>
      </dl>

      <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={saveAssignment}>
        <label className="sr-only" htmlFor={`assigned-staff-${mother.uid}`}>
          Assign staff member
        </label>
        <select
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          disabled={loading || saving || staff.length === 0}
          id={`assigned-staff-${mother.uid}`}
          onChange={(event) => setStaffUid(event.target.value)}
          value={staffUid}
        >
          <option value="">
            {loading ? "Loading active staff…" : "Select a staff member with a phone"}
          </option>
          {staff.map((member) => (
            <option key={member.uid} value={member.uid}>
              {member.fullName} · {member.role.replaceAll("_", " ")} · {member.phone}
              {member.facilityName ? ` · ${member.facilityName}` : ""}
            </option>
          ))}
        </select>
        <button
          className="rounded-lg bg-cyan-800 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!staffUid || saving || loading}
          type="submit"
        >
          {saving ? "Saving…" : "Assign staff"}
        </button>
        {mother.assignedStaffUid && (
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            disabled={saving}
            onClick={() => void clearAssignment()}
            type="button"
          >
            Clear assignment
          </button>
        )}
      </form>

      {staff.length === 0 && !loading && !error && (
        <p className="mt-2 text-xs text-amber-800">
          No active staff members with valid phone numbers are available to assign.
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-2 text-sm text-emerald-800" role="status">
          {notice}
        </p>
      )}
      {!loading && (
        <button
          className="mt-2 text-xs font-semibold text-cyan-800 underline"
          onClick={() => void loadStaff()}
          type="button"
        >
          Refresh staff list
        </button>
      )}
    </section>
  );
}
