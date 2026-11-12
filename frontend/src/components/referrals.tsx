"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  createReferralRecord,
  updateReferralStatus,
  type MotherProfile,
  type MotherScopedRecord,
} from "@/lib/care-data";

type Props = {
  mothers: MotherProfile[];
  referrals: MotherScopedRecord[];
  staffUid: string;
  staffName: string;
  facility: string;
};

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm";

export function Referrals({ mothers, referrals, staffUid, staffName, facility }: Props) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [motherUid, setMotherUid] = useState("");
  const [patientType, setPatientType] = useState<"mother" | "newborn">("mother");
  const [patientName, setPatientName] = useState("");
  const [reason, setReason] = useState("");
  const [destination, setDestination] = useState("");
  const [receivingUnit, setReceivingUnit] = useState("");
  const [receivingContact, setReceivingContact] = useState("");
  const [urgency, setUrgency] = useState<"routine" | "urgent" | "emergency">("urgent");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const activeCount = referrals.filter(
    (referral) => !["completed", "cancelled"].includes(status(referral)),
  ).length;
  const visibleReferrals = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return referrals.filter((referral) => {
      const currentStatus = status(referral);
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && !["completed", "cancelled"].includes(currentStatus)) ||
        currentStatus === filter;
      const matchesSearch =
        !normalized ||
        [
          referral.motherName,
          value(referral.values.patientName),
          value(referral.values.destination),
          value(referral.values.reason),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return matchesFilter && matchesSearch;
    });
  }, [filter, referrals, search]);

  const selectedMother =
    mothers.find((mother) => mother.uid === motherUid) ?? null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!selectedMother || !reason.trim() || !destination.trim()) {
      setFormError("Select a mother and provide the reason and receiving facility.");
      return;
    }
    if (urgency === "emergency" && !receivingContact.trim()) {
      setFormError("Add the receiving facility contact for an emergency referral.");
      return;
    }
    setIsSaving(true);
    try {
      await createReferralRecord({
        motherUid: selectedMother.uid,
        patientName:
          patientType === "mother"
            ? selectedMother.fullName
            : patientName.trim() || `Newborn of ${selectedMother.fullName}`,
        patientType,
        reason: reason.trim(),
        destination: destination.trim(),
        receivingUnit: receivingUnit.trim(),
        receivingContact: receivingContact.trim(),
        urgency,
        notes: notes.trim(),
        staffUid,
      });
      setPatientName("");
      setReason("");
      setDestination("");
      setReceivingUnit("");
      setReceivingContact("");
      setNotes("");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not create referral.");
    } finally {
      setIsSaving(false);
    }
  }

  async function changeStatus(referral: MotherScopedRecord, nextStatus: string) {
    setActionError("");
    setSavingId(referral.id);
    try {
      await updateReferralStatus(referral.motherUid, referral.id, nextStatus);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update referral.");
    } finally {
      setSavingId("");
    }
  }

  function printReferral(referral: MotherScopedRecord) {
    const printWindow = window.open("", "_blank", "width=800,height=700");
    if (!printWindow) {
      setActionError("Allow pop-ups to print a referral slip.");
      return;
    }
    const fields = [
      ["Patient", value(referral.values.patientName, referral.motherName)],
      ["Patient type", value(referral.values.patientType).replaceAll("_", " ")],
      ["Referral reason", value(referral.values.reason)],
      ["Destination", value(referral.values.destination)],
      ["Receiving unit", value(referral.values.receivingUnit, "Not specified")],
      ["Urgency", value(referral.values.urgency).toUpperCase()],
      ["Status", status(referral)],
      ["Referring worker", staffName],
      ["Facility", facility],
    ];
    const safeText = (text: string) =>
      text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    printWindow.document.write(
      `<html><head><title>Referral slip</title><style>body{font:16px Arial;max-width:760px;margin:40px auto;color:#0f172a}h1{font-size:22px;border-bottom:1px solid #cbd5e1;padding-bottom:12px}.row{padding:10px 0;border-bottom:1px solid #e2e8f0}.label{color:#64748b;font-size:12px;text-transform:uppercase}.value{margin-top:4px}</style></head><body><h1>BabyHealth Guard · Referral note</h1>${fields
        .map(
          ([label, content]) =>
            `<div class="row"><div class="label">${safeText(label)}</div><div class="value">${safeText(content)}</div></div>`,
        )
        .join("")}<script>window.onload=()=>window.print()</script></body></html>`,
    );
    printWindow.document.close();
  }

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-xl font-bold text-slate-900">Patient referrals</h2>
        <p className="mt-1 text-sm text-slate-600">
          Create, follow, and print maternal or newborn referral notes.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Total referrals" value={referrals.length} />
        <Metric label="Active referrals" value={activeCount} />
        <Metric label="Emergency referrals" value={referrals.filter((item) => value(item.values.urgency) === "emergency" && !["completed", "cancelled"].includes(status(item))).length} />
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row">
            <input
              aria-label="Search referrals"
              className={`${fieldClass} mt-0`}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patient, reason, or destination"
              type="search"
              value={search}
            />
            <select
              aria-label="Filter referrals"
              className={`${fieldClass} mt-0 sm:max-w-48`}
              onChange={(event) => setFilter(event.target.value)}
              value={filter}
            >
              <option value="all">All referrals</option>
              <option value="active">Active</option>
              <option value="referred">Referred</option>
              <option value="in_transit">In transit</option>
              <option value="received">Received</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          {actionError && <p className="mx-4 mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{actionError}</p>}
          {visibleReferrals.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              {referrals.length === 0 ? "No referrals have been recorded." : "No referrals match this filter."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visibleReferrals.map((referral) => {
                const currentStatus = status(referral);
                return (
                  <li className="space-y-3 p-4" key={`${referral.motherUid}-${referral.id}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {value(referral.values.patientName, referral.motherName)}
                          <span className="ml-2 text-xs font-normal capitalize text-slate-500">
                            ({value(referral.values.patientType, "mother")})
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {value(referral.values.reason)} · {value(referral.values.destination)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Mother profile: {referral.motherName}
                          {value(referral.values.receivingUnit)
                            ? ` · ${value(referral.values.receivingUnit)}`
                            : ""}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${value(referral.values.urgency) === "emergency" ? "bg-rose-100 text-rose-800" : value(referral.values.urgency) === "urgent" ? "bg-amber-100 text-amber-800" : "bg-cyan-100 text-cyan-900"}`}>
                        {value(referral.values.urgency, "routine")} · {currentStatus.replaceAll("_", " ")}
                      </span>
                    </div>
                    {value(referral.values.notes) && (
                      <p className="text-sm text-slate-600">{value(referral.values.notes)}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => printReferral(referral)} type="button">
                        Print referral slip
                      </button>
                      {currentStatus !== "completed" && currentStatus !== "cancelled" && (
                        <select
                          aria-label={`Update status for ${value(referral.values.patientName, referral.motherName)}`}
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                          disabled={savingId === referral.id}
                          onChange={(event) => changeStatus(referral, event.target.value)}
                          value={currentStatus}
                        >
                          <option value="referred">Referred</option>
                          <option value="in_transit">In transit</option>
                          <option value="received">Received</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <form className="space-y-4 rounded-xl border border-slate-200 bg-white p-5" onSubmit={submit}>
          <div>
            <h3 className="font-semibold text-slate-900">Create referral</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Referral records are attached to a mother&apos;s profile for authorized staff.
            </p>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Mother profile
            <select className={fieldClass} onChange={(event) => setMotherUid(event.target.value)} required value={motherUid}>
              <option value="" disabled>Select a mother</option>
              {mothers.map((mother) => <option key={mother.uid} value={mother.uid}>{mother.fullName}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Referred patient
            <select className={fieldClass} onChange={(event) => setPatientType(event.target.value as "mother" | "newborn")} value={patientType}>
              <option value="mother">Mother</option>
              <option value="newborn">Newborn linked to mother</option>
            </select>
          </label>
          {patientType === "newborn" && (
            <label className="block text-sm font-medium text-slate-700">
              Baby name / identifier
              <input className={fieldClass} onChange={(event) => setPatientName(event.target.value)} required value={patientName} />
            </label>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Reason for referral
            <input className={fieldClass} onChange={(event) => setReason(event.target.value)} required value={reason} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Destination facility
            <input className={fieldClass} onChange={(event) => setDestination(event.target.value)} required value={destination} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Receiving unit
            <input className={fieldClass} onChange={(event) => setReceivingUnit(event.target.value)} value={receivingUnit} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Receiving facility contact
            <input className={fieldClass} onChange={(event) => setReceivingContact(event.target.value)} type="tel" value={receivingContact} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Urgency
            <select className={fieldClass} onChange={(event) => setUrgency(event.target.value as typeof urgency)} value={urgency}>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Emergency</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Clinical notes
            <textarea className={fieldClass} onChange={(event) => setNotes(event.target.value)} rows={3} value={notes} />
          </label>
          {formError && <p className="text-sm text-rose-700" role="alert">{formError}</p>}
          <button className="w-full rounded-lg bg-cyan-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-900 disabled:opacity-60" disabled={isSaving || mothers.length === 0} type="submit">
            {isSaving ? "Creating…" : "Create referral"}
          </button>
        </form>
      </div>
    </section>
  );
}

function Metric({ label, value: count }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{count}</p></div>;
}

function value(raw: unknown, fallback = ""): string {
  return typeof raw === "string" || typeof raw === "number" ? String(raw) : fallback;
}

function status(referral: MotherScopedRecord): string {
  return value(referral.values.status, "referred").toLowerCase();
}
