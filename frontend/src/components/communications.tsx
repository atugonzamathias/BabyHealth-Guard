"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  sendSmsToMother,
  type AppointmentRecord,
  type MotherProfile,
  type MotherScopedRecord,
} from "@/lib/care-data";

type Props = {
  mothers: MotherProfile[];
  appointments: AppointmentRecord[];
  smsLogs: MotherScopedRecord[];
};

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm";

export function Communications({ mothers, appointments, smsLogs }: Props) {
  const [motherUid, setMotherUid] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("staff_message");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [ussdInput, setUssdInput] = useState("");
  const [ussdScreen, setUssdScreen] = useState("idle");
  const [ussdReply, setUssdReply] = useState("");

  const selectedMother = mothers.find((mother) => mother.uid === motherUid) ?? null;
  const filteredLogs = useMemo(
    () =>
      smsLogs.filter((log) => {
        const direction = stringValue(log.values.direction, "outbound").toLowerCase();
        return filter === "all" || direction === filter;
      }),
    [filter, smsLogs],
  );
  const outboundCount = smsLogs.filter(
    (log) => stringValue(log.values.direction).toLowerCase() === "outbound",
  ).length;

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!selectedMother || !message.trim()) {
      setError("Select a mother and enter a message.");
      return;
    }
    if (message.trim().length > 480) {
      setError("Keep the message to 480 characters or fewer.");
      return;
    }
    if (!consentConfirmed) {
      setError("Confirm that the mother has agreed to receive this SMS.");
      return;
    }
    if (!window.confirm(`Send a live SMS to ${selectedMother.fullName} at the number on her profile? Provider charges may apply.`)) {
      return;
    }
    setIsSending(true);
    try {
      await sendSmsToMother(selectedMother.uid, message.trim(), category, true);
      setNotice("Africa's Talking accepted the SMS request. Delivery confirmation may arrive separately.");
      setMessage("");
      setConsentConfirmed(false);
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "The SMS could not be sent. Check the messaging configuration and try again.",
      );
    } finally {
      setIsSending(false);
    }
  }

  function dialUssd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUssdReply("");
    if (ussdInput.trim() !== "*920#") {
      setUssdScreen("invalid");
      return;
    }
    setUssdScreen("menu");
  }

  function chooseUssdOption(option: "1" | "2" | "3") {
    if (option === "3") {
      setUssdScreen("ended");
      setUssdReply("Thank you. This simulated session has ended.");
      return;
    }
    if (!selectedMother) {
      setUssdReply("Select a mother above to simulate a personalized USSD response.");
      return;
    }
    if (option === "1") {
      const next = appointments.find(
        (appointment) =>
          appointment.motherUid === selectedMother.uid &&
          appointmentDate(appointment) !== null &&
          appointmentDate(appointment)!.getTime() >= Date.now(),
      );
      setUssdReply(
        next
          ? `SIMULATED: Next visit ${appointmentDate(next)!.toLocaleString()} at ${stringValue(next.values.clinic, "your clinic")}.`
          : "SIMULATED: No upcoming clinic visit is currently recorded.",
      );
      return;
    }
    setUssdReply(
      selectedMother.phone
        ? `SIMULATED: A health worker can contact you at ${selectedMother.phone}. For danger signs, go to the nearest health facility.`
        : "SIMULATED: Contact information is not available in this mother profile.",
    );
  }

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-xl font-bold text-slate-900">SMS &amp; USSD</h2>
        <p className="mt-1 text-sm text-slate-600">
          Send a live, staff-initiated SMS via the secure server integration, or exercise the USSD flow in the local simulator.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Registered mothers" value={mothers.length} />
        <Metric label="Outbound SMS log entries" value={outboundCount} />
        <Metric label="USSD short code (simulator)" value="*920#" />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h3 className="font-semibold text-slate-900">Send a live SMS</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              The server looks up the recipient&apos;s phone from her Firestore profile. The API key is never sent to this page. Confirm consent and message accuracy before sending; SMS charges and carrier delivery delays may apply.
            </p>
          </div>
          <form className="space-y-4" onSubmit={sendMessage}>
            <label className="block text-sm font-medium text-slate-700">
              Mother
              <select className={fieldClass} onChange={(event) => setMotherUid(event.target.value)} required value={motherUid}>
                <option value="" disabled>Select a mother</option>
                {mothers.map((mother) => (
                  <option key={mother.uid} value={mother.uid}>
                    {mother.fullName}{mother.phone ? ` · ${mother.phone}` : " · no phone recorded"}
                  </option>
                ))}
              </select>
            </label>
            {selectedMother && !selectedMother.phone && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900" role="status">
                This profile has no phone number. Add one to the mother&apos;s Firestore profile before sending.
              </p>
            )}
            <label className="block text-sm font-medium text-slate-700">
              Message category
              <select className={fieldClass} onChange={(event) => setCategory(event.target.value)} value={category}>
                <option value="staff_message">Staff message</option>
                <option value="appointment_reminder">Appointment reminder</option>
                <option value="care_guidance">Care guidance</option>
                <option value="follow_up">Follow-up</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              SMS message
              <textarea
                className={fieldClass}
                maxLength={480}
                onChange={(event) => setMessage(event.target.value)}
                required
                rows={5}
                value={message}
              />
              <span className="mt-1 block text-right text-xs text-slate-500">{message.length}/480</span>
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                checked={consentConfirmed}
                className="mt-1"
                onChange={(event) => setConsentConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>I confirmed that this mother agreed to receive this message.</span>
            </label>
            {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
            {notice && <p className="text-sm text-emerald-800" role="status">{notice}</p>}
            <button className="w-full rounded-lg bg-cyan-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-900 disabled:opacity-60" disabled={isSending || !selectedMother?.phone} type="submit">
              {isSending ? "Sending…" : "Send live SMS"}
            </button>
          </form>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h3 className="font-semibold text-slate-900">USSD phone simulator</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              This is a local demonstration only. It does not connect to a telecom short code, receive real USSD sessions, or send messages.
            </p>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Simulate for mother
            <select className={fieldClass} onChange={(event) => setMotherUid(event.target.value)} value={motherUid}>
              <option value="">Select a mother (optional)</option>
              {mothers.map((mother) => <option key={mother.uid} value={mother.uid}>{mother.fullName}</option>)}
            </select>
          </label>
          <div className="mx-auto max-w-sm rounded-[2rem] border-4 border-slate-800 bg-slate-900 p-3 shadow-lg">
            <div className="min-h-72 rounded-[1.4rem] bg-slate-100 p-4">
              <div className="mb-4 flex justify-between text-xs font-semibold text-slate-600">
                <span>BabyHealth SIM</span><span>2G · Demo</span>
              </div>
              {ussdScreen === "menu" ? (
                <div className="space-y-3 text-sm text-slate-800">
                  <p className="font-bold">BabyHealth Guard</p>
                  <p>1. Next clinic visit</p>
                  <p>2. Health worker contact</p>
                  <p>3. Exit</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {(["1", "2", "3"] as const).map((option) => (
                      <button className="rounded border border-slate-300 bg-white px-3 py-1" key={option} onClick={() => chooseUssdOption(option)} type="button">{option}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-700">
                  {ussdReply || (ussdScreen === "invalid" ? "Invalid code. Dial *920# to start the demo." : ussdScreen === "ended" ? "Session ended." : "Enter *920# to open the simulated menu.")}
                </p>
              )}
              {ussdReply && ussdScreen === "menu" && (
                <p className="mt-4 rounded-lg bg-white p-3 text-xs text-slate-700">{ussdReply}</p>
              )}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={dialUssd}>
              <input aria-label="USSD code to simulate" className="min-w-0 flex-1 rounded-lg px-3 py-2 text-sm" onChange={(event) => setUssdInput(event.target.value)} placeholder="*920#" value={ussdInput} />
              <button className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white" type="submit">Dial</button>
            </form>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h3 className="font-semibold text-slate-900">SMS activity</h3>
            <p className="mt-1 text-xs text-slate-500">Provider acceptance is not a delivery receipt.</p>
          </div>
          <select aria-label="Filter SMS activity" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onChange={(event) => setFilter(event.target.value)} value={filter}>
            <option value="all">All activity</option>
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
          </select>
        </div>
        {filteredLogs.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No SMS activity is recorded yet. Simulated USSD sessions are not stored as messages.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <li className="p-4" key={`${log.motherUid}-${log.id}`}>
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{log.motherName} · {stringValue(log.values.direction, "outbound")}</p>
                  <span className="text-xs capitalize text-slate-500">{stringValue(log.values.status, "queued")}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{stringValue(log.values.message, "Message content not recorded")}</p>
                <p className="mt-1 text-xs text-slate-500">{stringValue(log.values.category, "SMS")} · {formatDate(log.values.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></div>;
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function appointmentDate(appointment: AppointmentRecord): Date | null {
  const value = appointment.values.scheduledAt;
  if (value instanceof Date) return value;
  return value && typeof value === "object" && "toDate" in value &&
    typeof value.toDate === "function"
    ? value.toDate()
    : null;
}

function formatDate(value: unknown): string {
  if (value instanceof Date) return value.toLocaleString();
  return value && typeof value === "object" && "toDate" in value &&
    typeof value.toDate === "function"
    ? value.toDate().toLocaleString()
    : "Time not recorded";
}
