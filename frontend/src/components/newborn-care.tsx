"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createNewbornRecord,
  updateNewbornCheckup,
  watchNewbornCheckups,
  type CareRecord,
  type MotherProfile,
  type MotherScopedRecord,
} from "@/lib/care-data";

type Props = {
  mothers: MotherProfile[];
  newborns: MotherScopedRecord[];
  staffUid: string;
};

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm";

export function NewbornCare({ mothers, newborns, staffUid }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<MotherScopedRecord | null>(null);
  const [motherUid, setMotherUid] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthWeight, setBirthWeight] = useState("");
  const [weight, setWeight] = useState("");
  const [temperature, setTemperature] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [feeding, setFeeding] = useState("exclusive_breastfeeding");
  const [kmcHours, setKmcHours] = useState("");
  const [cordStatus, setCordStatus] = useState("normal");
  const [immunizationStatus, setImmunizationStatus] = useState("not_recorded");
  const [followUpPriority, setFollowUpPriority] = useState("needs_review");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [checkups, setCheckups] = useState<CareRecord[]>([]);
  const [checkupsError, setCheckupsError] = useState("");

  const visibleNewborns = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return newborns.filter((baby) => {
      const status = text(baby.values.status, "normal").toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "attention" && status !== "normal") ||
        (statusFilter === status);
      const matchesQuery =
        !normalized ||
        [text(baby.values.name), baby.motherName, text(baby.values.community)]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [newborns, query, statusFilter]);
  const urgentCount = newborns.filter(
    (baby) => text(baby.values.status).toLowerCase() === "urgent",
  ).length;

  useEffect(() => {
    if (!editing) return;
    return watchNewbornCheckups(
      editing.motherUid,
      editing.id,
      setCheckups,
      (error) => setCheckupsError(`Could not load check-up history: ${error.message}`),
    );
  }, [editing]);

  function resetForm() {
    setEditing(null);
    setCheckups([]);
    setCheckupsError("");
    setMotherUid("");
    setName("");
    setBirthDate("");
    setBirthWeight("");
    setWeight("");
    setTemperature("");
    setRespiratoryRate("");
    setFeeding("exclusive_breastfeeding");
    setKmcHours("");
    setCordStatus("normal");
    setImmunizationStatus("not_recorded");
    setFollowUpPriority("needs_review");
    setNotes("");
    setFormError("");
  }

  function startCheckup(baby: MotherScopedRecord) {
    setCheckups([]);
    setCheckupsError("");
    setEditing(baby);
    setMotherUid(baby.motherUid);
    setName(text(baby.values.name));
    setBirthDate("");
    setBirthWeight(asNumberText(baby.values.birthWeightKg));
    setWeight(asNumberText(baby.values.currentWeightKg));
    setTemperature(asNumberText(baby.values.temperatureC));
    setRespiratoryRate(asNumberText(baby.values.respiratoryRate));
    setFeeding(text(baby.values.feeding, "exclusive_breastfeeding"));
    setKmcHours(asNumberText(baby.values.kmcHours));
    setCordStatus(text(baby.values.cordStatus, "normal"));
    setImmunizationStatus(text(baby.values.immunizationStatus, "not_recorded"));
    setFollowUpPriority(text(baby.values.status, "needs_review"));
    setNotes(text(baby.values.notes));
    setFormError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const currentWeight = optionalNumber(weight);
    const temp = optionalNumber(temperature);
    const breathing = optionalNumber(respiratoryRate);
    const kmc = optionalNumber(kmcHours);
    if (
      [birthWeight, weight, temperature, respiratoryRate, kmcHours].some(
        (raw) => raw.trim() && optionalNumber(raw) === null,
      )
    ) {
      setFormError("Enter valid numeric values for the recorded measurements.");
      return;
    }
    if (
      (currentWeight !== null && currentWeight <= 0) ||
      (optionalNumber(birthWeight) !== null && optionalNumber(birthWeight)! <= 0)
    ) {
      setFormError("Birth and current weight must be greater than zero.");
      return;
    }
    if (kmc !== null && (kmc < 0 || kmc > 24)) {
      setFormError("Kangaroo Mother Care hours must be between 0 and 24.");
      return;
    }
    if (temp !== null && (temp < 30 || temp > 45)) {
      setFormError("Enter a valid temperature in °C.");
      return;
    }
    if (breathing !== null && breathing <= 0) {
      setFormError("Breathing rate must be greater than zero.");
      return;
    }
    setIsSaving(true);
    try {
      if (editing) {
        await updateNewbornCheckup(
          editing.motherUid,
          editing.id,
          {
            currentWeightKg: currentWeight,
            temperatureC: temp,
            respiratoryRate: breathing,
            feeding,
            kmcHours: kmc,
            cordStatus,
            immunizationStatus,
            followUpPriority,
            notes: notes.trim(),
          },
          staffUid,
        );
      } else {
        const parsedBirthDate = new Date(`${birthDate}T12:00:00`);
        if (!motherUid || !name.trim() || !birthDate || Number.isNaN(parsedBirthDate.getTime())) {
          setFormError("Choose a mother, baby name, and valid date of birth.");
          return;
        }
        await createNewbornRecord({
          motherUid,
          name: name.trim(),
          birthDate: parsedBirthDate,
          birthWeightKg: optionalNumber(birthWeight),
          currentWeightKg: currentWeight,
          temperatureC: temp,
          respiratoryRate: breathing,
          feeding,
          kmcHours: kmc,
          cordStatus,
          immunizationStatus,
          followUpPriority,
          notes: notes.trim(),
          createdBy: staffUid,
        });
      }
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save newborn record.");
    } finally {
      setIsSaving(false);
    }
  }

  function exportRegistry() {
    const rows = [
      ["Baby", "Mother", "Age in days", "Weight kg", "Temperature C", "Breaths/min", "KMC hours today", "Feeding", "Cord status", "Immunization status", "Staff follow-up priority"],
      ...newborns.map((baby) => [
        text(baby.values.name),
        baby.motherName,
        String(ageDays(baby.values.birthDate) ?? ""),
        text(baby.values.currentWeightKg),
        text(baby.values.temperatureC),
        text(baby.values.respiratoryRate),
        text(baby.values.kmcHours),
        text(baby.values.feeding),
        text(baby.values.cordStatus),
        text(baby.values.immunizationStatus),
        text(baby.values.status),
      ]),
    ];
    downloadCsv("newborn-care-registry.csv", rows);
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Newborn care</h2>
          <p className="mt-1 text-sm text-slate-600">
            Track newborn checks, growth, feeding, cord care, KMC, and immunization with an audit history for each check.
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
          onClick={exportRegistry}
          type="button"
        >
          Export newborn registry
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Newborns registered" value={newborns.length} />
        <Metric label="Need attention" value={urgentCount} />
        <Metric label="Mothers with newborn records" value={new Set(newborns.map((baby) => baby.motherUid)).size} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row">
            <input
              aria-label="Search newborns"
              className={`${fieldClass} mt-0`}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search baby, mother, or community"
              type="search"
              value={query}
            />
            <select
              aria-label="Filter newborns by status"
              className={`${fieldClass} mt-0 sm:max-w-48`}
              onChange={(event) => setStatusFilter(event.target.value)}
              value={statusFilter}
            >
              <option value="all">All statuses</option>
              <option value="attention">Needs attention</option>
              <option value="urgent">Urgent</option>
              <option value="routine">Routine</option>
              <option value="needs_review">Needs review</option>
            </select>
          </div>
          {visibleNewborns.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              {newborns.length === 0
                ? "No newborn records yet. Register a baby to start tracking care."
                : "No newborns match your search or filter."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visibleNewborns.map((baby) => {
                const age = ageDays(baby.values.birthDate);
                const status = text(baby.values.status, "normal");
                return (
                  <li
                    className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                    key={`${baby.motherUid}-${baby.id}`}
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {text(baby.values.name, "Newborn")}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Mother: {baby.motherName} · {age === null ? "Age unknown" : `Day ${age}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Weight {text(baby.values.currentWeightKg, "—")} kg · Temp{" "}
                        {text(baby.values.temperatureC, "—")}°C · Breaths{" "}
                        {text(baby.values.respiratoryRate, "—")}/min
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Feeding: {text(baby.values.feeding, "Not recorded").replaceAll("_", " ")} ·
                        {" "}Cord: {text(baby.values.cordStatus, "Not recorded")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        KMC today: {text(baby.values.kmcHours, "—")} hrs · Immunizations:{" "}
                        {text(baby.values.immunizationStatus, "Not recorded").replaceAll("_", " ")}
                        {age !== null ? ` · ${nextNewbornMilestone(age)}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Last check: {formatRecordDate(baby.values.lastCheckedAt ?? baby.values.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${status === "urgent" ? "bg-rose-100 text-rose-800" : status === "attention" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {status}
                      </span>
                      <button
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => startCheckup(baby)}
                        type="button"
                      >
                        Record check
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <form className="space-y-4 rounded-xl border border-slate-200 bg-white p-5" onSubmit={save}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">
                {editing ? "Record newborn check" : "Register newborn"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Measurements are recorded without automated clinical interpretation. Choose a follow-up priority using your local clinical protocol.
              </p>
            </div>
            {editing && (
              <button className="text-xs font-semibold text-cyan-800" onClick={resetForm} type="button">
                New baby
              </button>
            )}
          </div>
          {!editing && (
            <>
              <label className="block text-sm font-medium text-slate-700">
                Mother
                <select className={fieldClass} onChange={(event) => setMotherUid(event.target.value)} required value={motherUid}>
                  <option value="" disabled>Select a mother</option>
                  {mothers.map((mother) => <option key={mother.uid} value={mother.uid}>{mother.fullName}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Baby name / identification
                <input className={fieldClass} onChange={(event) => setName(event.target.value)} required value={name} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  Date of birth
                  <input className={fieldClass} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setBirthDate(event.target.value)} required type="date" value={birthDate} />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Birth weight (kg)
                  <input className={fieldClass} min="0.1" onChange={(event) => setBirthWeight(event.target.value)} step="0.01" type="number" value={birthWeight} />
                </label>
              </div>
            </>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Staff-assigned follow-up priority
            <select
              className={fieldClass}
              onChange={(event) => setFollowUpPriority(event.target.value)}
              value={followUpPriority}
            >
              <option value="needs_review">Needs review</option>
              <option value="routine">Routine follow-up</option>
              <option value="attention">Priority follow-up</option>
              <option value="urgent">Urgent staff follow-up</option>
            </select>
          </label>
          {editing && (
            <>
              <p className="rounded-lg bg-cyan-50 p-3 text-sm text-cyan-950">
                {name} · {editing.motherName}
              </p>
              <div className="rounded-lg border border-slate-200 p-3">
                <h4 className="text-sm font-semibold text-slate-800">Check-up history</h4>
                {checkupsError ? (
                  <p className="mt-2 text-xs text-rose-700" role="alert">{checkupsError}</p>
                ) : checkups.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">No prior check-up entries.</p>
                ) : (
                  <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                    {checkups.map((checkup) => (
                      <li className="border-t border-slate-100 pt-2 text-xs text-slate-600" key={checkup.id}>
                        {formatRecordDate(checkup.values.recordedAt)} ·{" "}
                        {text(checkup.values.currentWeightKg, "—")} kg ·{" "}
                        {text(checkup.values.temperatureC, "—")}°C ·{" "}
                        {text(checkup.values.respiratoryRate, "—")} breaths/min
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-700">
              Current weight (kg)
              <input className={fieldClass} min="0.1" onChange={(event) => setWeight(event.target.value)} step="0.01" type="number" value={weight} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Temperature (°C)
              <input className={fieldClass} max="45" min="30" onChange={(event) => setTemperature(event.target.value)} step="0.1" type="number" value={temperature} />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Respiratory rate (breaths/min)
            <input className={fieldClass} min="1" onChange={(event) => setRespiratoryRate(event.target.value)} type="number" value={respiratoryRate} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Kangaroo Mother Care today (hours)
            <input className={fieldClass} max="24" min="0" onChange={(event) => setKmcHours(event.target.value)} step="0.5" type="number" value={kmcHours} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-700">
              Feeding
              <select className={fieldClass} onChange={(event) => setFeeding(event.target.value)} value={feeding}>
                <option value="exclusive_breastfeeding">Breastfeeding</option>
                <option value="mixed_feeding">Mixed feeding</option>
                <option value="formula">Formula</option>
                <option value="not_assessed">Not assessed</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Cord status
              <select className={fieldClass} onChange={(event) => setCordStatus(event.target.value)} value={cordStatus}>
                <option value="normal">Normal</option>
                <option value="needs_review">Needs review</option>
                <option value="not_assessed">Not assessed</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Newborn immunizations
            <select className={fieldClass} onChange={(event) => setImmunizationStatus(event.target.value)} value={immunizationStatus}>
              <option value="not_recorded">Not recorded</option>
              <option value="due">Due / follow-up needed</option>
              <option value="bcg_opv0_recorded">BCG and OPV-0 recorded</option>
              <option value="review_required">Review immunization card</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Care notes
            <textarea className={fieldClass} onChange={(event) => setNotes(event.target.value)} rows={3} value={notes} />
          </label>
          {formError && <p className="text-sm text-rose-700" role="alert">{formError}</p>}
          <button className="w-full rounded-lg bg-cyan-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-900 disabled:opacity-60" disabled={isSaving || (!editing && mothers.length === 0)} type="submit">
            {isSaving ? "Saving…" : editing ? "Save check-up" : "Register baby"}
          </button>
        </form>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function asNumberText(value: unknown): string {
  return typeof value === "number" ? String(value) : "";
}

function optionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function ageDays(value: unknown): number | null {
  const date =
    value instanceof Date
      ? value
      : value && typeof value === "object" && "toDate" in value &&
          typeof value.toDate === "function"
        ? value.toDate()
        : null;
  if (!date) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

function formatRecordDate(value: unknown): string {
  const date =
    value instanceof Date
      ? value
      : value && typeof value === "object" && "toDate" in value &&
          typeof value.toDate === "function"
        ? value.toDate()
        : null;
  return date ? date.toLocaleString() : "Time not recorded";
}

function nextNewbornMilestone(age: number): string {
  const milestone = [1, 3, 7, 28].find((day) => day >= age);
  return milestone ? `Milestone check: day ${milestone}` : "First 28-day period complete";
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
