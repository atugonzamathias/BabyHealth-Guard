"use client";

import { useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import type { MotherProfile } from "@/lib/care-data";

type Props = { mothers: MotherProfile[] };
type Action = "vitals" | "kick" | "iron" | "danger";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function EnterRecord({ mothers }: Props) {
  const [query, setQuery] = useState("");
  const [motherUid, setMotherUid] = useState("");
  const [action, setAction] = useState<Action>("vitals");
  const [day, setDay] = useState(today);
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [kicks, setKicks] = useState("0");
  const [amount, setAmount] = useState("1");
  const [taken, setTaken] = useState("true");
  const [sign, setSign] = useState("Bleeding");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("urgent");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredMothers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return mothers.filter((mother) =>
      !normalized ||
      [mother.fullName, mother.phone, mother.village].join(" ").toLowerCase().includes(normalized),
    );
  }, [mothers, query]);
  const selectedMother = mothers.find((mother) => mother.uid === motherUid);

  async function save() {
    setError("");
    setNotice("");
    if (!selectedMother) {
      setError("Select a mother first.");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setError("Sign in again before entering a record.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        motherUid, action, day, sign, description, severity,
        systolic: systolic ? Number(systolic) : null,
        diastolic: diastolic ? Number(diastolic) : null,
        kicks: Number(kicks),
        amount: Number(amount),
        taken: taken === "true",
      };
      const response = await fetch("/api/mother-records", {
        method: "POST",
        headers: {
          Authorization: `****** user.getIdToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Could not save the record.");
      setNotice(`${action === "danger" ? "Danger sign" : "Health record"} saved for ${selectedMother.fullName}.`);
      setDescription("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Enter record</h2>
        <p className="mt-1 text-sm text-slate-600">
          Record the same health activities a mother can enter in the mobile app.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.4fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Select mother</h3>
            <input aria-label="Search mothers" className={fieldClass} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or phone" value={query} />
          </div>
          <div className="max-h-[55vh] overflow-y-auto">
            {filteredMothers.map((mother) => (
              <button className={`block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-cyan-50 ${mother.uid === motherUid ? "bg-cyan-50" : ""}`} key={mother.uid} onClick={() => setMotherUid(mother.uid)} type="button">
                <span className="block text-sm font-semibold text-slate-900">{mother.fullName}</span>
                <span className="text-xs text-slate-500">{mother.phone || mother.village || "No contact recorded"}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap gap-2">
            {([
              ["vitals", "Blood pressure & kicks"],
              ["kick", "Add kick count"],
              ["iron", "Iron & folic"],
              ["danger", "Danger sign"],
            ] as const).map(([value, label]) => (
              <button className={`rounded-lg px-3 py-2 text-sm font-semibold ${action === value ? "bg-cyan-800 text-white" : "bg-slate-100 text-slate-700"}`} key={value} onClick={() => setAction(value)} type="button">{label}</button>
            ))}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Date<input className={fieldClass} onChange={(event) => setDay(event.target.value)} type="date" value={day} /></label>
            {action === "vitals" && (
              <>
                <label className="text-sm font-medium text-slate-700">Systolic BP<input className={fieldClass} inputMode="numeric" onChange={(event) => setSystolic(event.target.value)} placeholder="e.g. 120" value={systolic} /></label>
                <label className="text-sm font-medium text-slate-700">Diastolic BP<input className={fieldClass} inputMode="numeric" onChange={(event) => setDiastolic(event.target.value)} placeholder="e.g. 80" value={diastolic} /></label>
                <label className="text-sm font-medium text-slate-700">Total kicks today<input className={fieldClass} inputMode="numeric" onChange={(event) => setKicks(event.target.value)} value={kicks} /></label>
              </>
            )}
            {action === "kick" && <label className="text-sm font-medium text-slate-700">Kicks to add<input className={fieldClass} inputMode="numeric" onChange={(event) => setAmount(event.target.value)} min="1" type="number" value={amount} /></label>}
            {action === "iron" && <label className="text-sm font-medium text-slate-700">Medication status<select className={fieldClass} onChange={(event) => setTaken(event.target.value)} value={taken}><option value="true">Taken</option><option value="false">Not taken</option></select></label>}
            {action === "danger" && (
              <>
                <label className="text-sm font-medium text-slate-700">Danger sign<select className={fieldClass} onChange={(event) => setSign(event.target.value)} value={sign}><option>Bleeding</option><option>Severe Headache</option><option>Baby Not Moving</option><option>High Fever</option><option>Severe abdominal pain</option><option>Reduced fetal movement</option></select></label>
                <label className="text-sm font-medium text-slate-700">Severity<select className={fieldClass} onChange={(event) => setSeverity(event.target.value)} value={severity}><option value="urgent">Urgent</option><option value="emergency">Emergency</option><option value="moderate">Moderate</option></select></label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Description<textarea className={fieldClass} maxLength={500} onChange={(event) => setDescription(event.target.value)} required rows={4} value={description} /></label>
              </>
            )}
          </div>
          {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
          {notice && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</p>}
          <button className="mt-5 rounded-lg bg-cyan-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={() => void save()} type="button">{saving ? "Saving…" : "Save record"}</button>
        </section>
      </div>
    </section>
  );
}
