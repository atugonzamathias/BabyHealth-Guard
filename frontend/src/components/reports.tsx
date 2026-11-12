"use client";

import { useMemo, useState } from "react";
import type {
  AppointmentRecord,
  MotherProfile,
  MotherScopedRecord,
} from "@/lib/care-data";

type Props = {
  mothers: MotherProfile[];
  newborns: MotherScopedRecord[];
  referrals: MotherScopedRecord[];
  appointments: AppointmentRecord[];
  facility: string;
};

export function Reports({ mothers, newborns, referrals, appointments, facility }: Props) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const period = useMemo(() => {
    const [year, selectedMonth] = month.split("-").map(Number);
    return {
      start: new Date(year, selectedMonth - 1, 1),
      end: new Date(year, selectedMonth, 1),
    };
  }, [month]);
  const periodAppointments = appointments.filter((appointment) => {
    const date = asDate(appointment.values.scheduledAt);
    return date !== null && date >= period.start && date < period.end;
  });
  const completedAppointments = periodAppointments.filter(
    (appointment) => stringValue(appointment.values.status).toLowerCase() === "completed",
  ).length;
  const periodNewborns = newborns.filter((baby) => {
    const date = asDate(baby.values.createdAt);
    return date !== null && date >= period.start && date < period.end;
  });
  const periodReferrals = referrals.filter((referral) => {
    const date = asDate(referral.values.createdAt);
    return date !== null && date >= period.start && date < period.end;
  });
  const highRiskMothers = mothers.filter((mother) => {
    const status = `${mother.maternalStatus} ${mother.conditions.join(" ")}`.toLowerCase();
    return status.includes("high risk") || status.includes("hypertension") ||
      status.includes("preeclampsia") || status.includes("anemia");
  }).length;
  const completionRate = periodAppointments.length
    ? Math.round((completedAppointments / periodAppointments.length) * 100)
    : 0;
  const urgentNewborns = newborns.filter(
    (baby) => stringValue(baby.values.status).toLowerCase() === "urgent",
  ).length;

  function exportReport() {
    const rows = [
      ["Indicator", "Count", "Reporting period"],
      ["Registered mothers", String(mothers.length), "Current registry"],
      ["Mothers with risk indicators", String(highRiskMothers), "Current registry; rule-based summary"],
      ["Appointments scheduled", String(periodAppointments.length), month],
      ["Appointments completed", String(completedAppointments), month],
      ["Appointment completion rate (%)", String(completionRate), month],
      ["Newborns registered", String(periodNewborns.length), month],
      ["Newborns currently flagged urgent", String(urgentNewborns), "Current registry"],
      ["Referrals created", String(periodReferrals.length), month],
      ["Facility", facility, month],
      ["Generated at", new Date().toISOString(), ""],
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `babyhealth-facility-report-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reporting &amp; analytics</h2>
          <p className="mt-1 text-sm text-slate-600">
            Summary indicators calculated from the live Firebase care records.
          </p>
        </div>
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="report-month">Reporting month</label>
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            id="report-month"
            onChange={(event) => setMonth(event.target.value)}
            type="month"
            value={month}
          />
          <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => window.print()} type="button">
            Print
          </button>
          <button className="rounded-lg bg-cyan-800 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-900" onClick={exportReport} type="button">
            Export CSV
          </button>
        </div>
      </header>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
        These are operational summaries, not validated Ministry of Health/HMIS submissions or clinical diagnoses. Review source records before using figures for official reporting.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Registered mothers" value={mothers.length} detail="Current registry" />
        <Metric label="Risk indicators" value={highRiskMothers} detail="Derived from profile text fields" />
        <Metric label="Visits this month" value={periodAppointments.length} detail={`${completedAppointments} completed · ${completionRate}%`} />
        <Metric label="Referrals this month" value={periodReferrals.length} detail={`${urgentNewborns} newborns currently flagged urgent`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Maternal care activity</h3>
          <p className="mt-1 text-sm text-slate-500">{monthLabel(month)}</p>
          <div className="mt-5 space-y-4">
            <Progress label="Appointment completion" count={completedAppointments} total={periodAppointments.length} color="bg-cyan-700" />
            <Progress label="Open referrals" count={referrals.filter((item) => !["completed", "cancelled"].includes(stringValue(item.values.status).toLowerCase())).length} total={referrals.length} color="bg-amber-500" />
            <Progress label="Mothers with recorded phone" count={mothers.filter((mother) => mother.phone.trim()).length} total={mothers.length} color="bg-emerald-600" />
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Newborn care activity</h3>
          <p className="mt-1 text-sm text-slate-500">{monthLabel(month)}</p>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            <ReportValue label="Registered this month" value={periodNewborns.length} />
            <ReportValue label="Currently monitored" value={newborns.length} />
            <ReportValue label="Attention flags" value={newborns.filter((baby) => ["attention", "urgent"].includes(stringValue(baby.values.status).toLowerCase())).length} />
            <ReportValue label="Urgent flags" value={urgentNewborns} />
          </dl>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900">Appointment activity</h3>
        </div>
        {periodAppointments.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No appointments are scheduled in this reporting period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Mother</th>
                  <th className="px-4 py-3">Visit</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periodAppointments.slice(0, 100).map((appointment) => (
                  <tr key={`${appointment.motherUid}-${appointment.id}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">{appointment.motherName}</td>
                    <td className="px-4 py-3 text-slate-600">{stringValue(appointment.values.type, "Clinic visit")}</td>
                    <td className="px-4 py-3 text-slate-600">{asDate(appointment.values.scheduledAt)?.toLocaleString() ?? "Not recorded"}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{stringValue(appointment.values.status, "scheduled").replaceAll("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {periodAppointments.length > 100 && <p className="p-3 text-xs text-slate-500">Showing first 100 appointments. CSV export includes the aggregate indicators.</p>}
          </div>
        )}
      </section>
    </section>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

function Progress({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percent = total ? Math.round((count / total) * 100) : 0;
  return <div><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="text-slate-700">{label}</span><span className="font-semibold text-slate-800">{count}/{total} · {percent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} /></div></div>;
}

function ReportValue({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-xl font-bold text-slate-900">{value}</dd></div>;
}

function monthLabel(value: string): string {
  const date = new Date(`${value}-01T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  return value && typeof value === "object" && "toDate" in value &&
    typeof value.toDate === "function"
    ? value.toDate()
    : null;
}
