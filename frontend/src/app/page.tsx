"use client";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { auth, db } from "@/lib/firebase";
import { Communications } from "@/components/communications";
import { NewbornCare } from "@/components/newborn-care";
import { Referrals } from "@/components/referrals";
import { Reports } from "@/components/reports";
import { MaamaCareAssistant } from "@/components/maamacare-assistant";
import { MotherCareAssignment } from "@/components/mother-care-assignment";
import { SmsBilling } from "@/components/sms-billing";
import { UssdRequests } from "@/components/ussd-requests";
import {
  createMotherAppointment,
  updateMotherAppointmentStatus,
  watchAppointmentsForMothers,
  watchMotherRecords,
  watchMothers,
  watchNewbornsForMothers,
  watchReferralsForMothers,
  watchSmsLogsForMothers,
  type AppointmentRecord,
  type CareRecord,
  type MotherProfile,
  type MotherScopedRecord,
} from "@/lib/care-data";

const STAFF_ROLES = new Set([
  "doctor",
  "admin",
  "health_worker",
  "health worker",
  "nurse",
  "midwife",
]);

const STAFF_ROLE_OPTIONS = [
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
  { value: "midwife", label: "Midwife" },
  { value: "health_worker", label: "Health worker" },
  { value: "admin", label: "Administrator" },
] as const;

type StaffMember = {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  facilityName: string;
  facilityId: string;
  disabled: boolean;
};

type FacilityOption = {
  id: string;
  name: string;
};

type MidwifeOption = {
  uid: string;
  fullName: string;
  phone: string;
  facilityName: string;
};

type SessionState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "unauthorized"; message: string }
  | { status: "staff"; user: User; name: string; role: string; facility: string };

type RecordsState = {
  dailyVitals: CareRecord[];
  healthLogs: CareRecord[];
  appointments: CareRecord[];
};

const EMPTY_RECORDS: RecordsState = {
  dailyVitals: [],
  healthLogs: [],
  appointments: [],
};

function displayDate(value: unknown): string {
  if (!value || typeof value !== "object" || !("toDate" in value)) return "Date not recorded";
  const date = (value as { toDate: () => Date }).toDate();
  return Number.isNaN(date.getTime())
    ? "Date not recorded"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function recordSummary(record: CareRecord): string {
  const values = record.values;
  if (typeof values.type === "string") {
    return values.type.replaceAll("_", " ");
  }
  if (typeof values.day === "object" && values.day !== null) {
    return `Daily check-in · ${displayDate(values.day)}`;
  }
  return "Health record";
}

export default function Home() {
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mothers, setMothers] = useState<MotherProfile[]>([]);
  const [selectedUid, setSelectedUid] = useState("");
  const [recordsByMother, setRecordsByMother] = useState<
    Record<string, RecordsState>
  >({});
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<
    "mothers" | "newborns" | "appointments" | "referrals" | "communications" | "reports" | "staff" | "settings"
  >("mothers");
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [newborns, setNewborns] = useState<MotherScopedRecord[]>([]);
  const [referrals, setReferrals] = useState<MotherScopedRecord[]>([]);
  const [smsLogs, setSmsLogs] = useState<MotherScopedRecord[]>([]);
  const [dataError, setDataError] = useState("");
  const [isLoadingMothers, setIsLoadingMothers] = useState(false);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;
      if (!user) {
        setIsLoadingMothers(false);
        setDataError("");
        setActiveView("mothers");
        setSession({ status: "signed-out" });
        return;
      }

      setIsLoadingMothers(true);
      setDataError("");
      try {
        const profileSnapshot = await getDoc(doc(db, "users", user.uid));
        if (!active || auth.currentUser?.uid !== user.uid) return;
        if (!profileSnapshot.exists()) {
          await signOut(auth);
          setSession({
            status: "unauthorized",
            message: "Your staff profile is missing. Contact your administrator.",
          });
          return;
        }

        const profile = profileSnapshot.data();
        const role =
          typeof profile.role === "string" ? profile.role.trim().toLowerCase() : "";
        if (!STAFF_ROLES.has(role)) {
          await signOut(auth);
          setSession({
            status: "unauthorized",
            message: "This account is not authorized for the health-worker dashboard.",
          });
          return;
        }

        setSession({
          status: "staff",
          user,
          name:
            typeof profile.fullName === "string" && profile.fullName.trim()
              ? profile.fullName
              : user.email ?? "Health worker",
          role,
          facility:
            typeof profile.facilityName === "string"
              ? profile.facilityName
              : typeof profile.facilityId === "string"
                ? profile.facilityId
                : "Health facility",
        });
      } catch (error) {
        if (!active || auth.currentUser?.uid !== user.uid) return;
        const message =
          error instanceof Error ? error.message : "Could not load your staff profile.";
        await signOut(auth);
        setSession({ status: "unauthorized", message });
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session.status !== "staff") return;
    return watchMothers(
      (nextMothers) => {
        setMothers(nextMothers);
        setSelectedUid((current) =>
          current && nextMothers.some((mother) => mother.uid === current)
            ? current
            : (nextMothers[0]?.uid ?? ""),
        );
        setIsLoadingMothers(false);
      },
      (error) => {
        setDataError(`Could not load mother profiles: ${error.message}`);
        setIsLoadingMothers(false);
      },
    );
  }, [session]);

  useEffect(() => {
    if (session.status !== "staff") return;
    return watchAppointmentsForMothers(
      mothers,
      (nextAppointments) => {
        setAppointments(nextAppointments);
        setIsLoadingAppointments(false);
      },
      (error) => {
        setDataError(`Could not load appointments: ${error.message}`);
        setIsLoadingAppointments(false);
      },
    );
  }, [session, mothers]);

  useEffect(() => {
    if (session.status !== "staff") return;
    return watchNewbornsForMothers(mothers, setNewborns, (error) =>
      setDataError(`Could not load newborn records: ${error.message}`),
    );
  }, [session, mothers]);

  useEffect(() => {
    if (session.status !== "staff") return;
    return watchReferralsForMothers(mothers, setReferrals, (error) =>
      setDataError(`Could not load referrals: ${error.message}`),
    );
  }, [session, mothers]);

  useEffect(() => {
    if (session.status !== "staff") return;
    return watchSmsLogsForMothers(mothers, setSmsLogs, (error) =>
      setDataError(`Could not load SMS activity: ${error.message}`),
    );
  }, [session, mothers]);

  useEffect(() => {
    if (!selectedUid) return;
    const subscriptions = (Object.keys(EMPTY_RECORDS) as Array<keyof RecordsState>).map(
      (collectionName) =>
        watchMotherRecords(
          selectedUid,
          collectionName,
          (nextRecords) =>
            setRecordsByMother((current) => ({
              ...current,
              [selectedUid]: {
                ...(current[selectedUid] ?? EMPTY_RECORDS),
                [collectionName]: nextRecords,
              },
            })),
          (error) =>
            setDataError(
              `Could not load ${collectionName} for the selected mother: ${error.message}`,
            ),
        ),
    );
    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [selectedUid]);

  const filteredMothers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return mothers;
    return mothers.filter((mother) =>
      [mother.fullName, mother.email, mother.phone, mother.village]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [mothers, search]);

  const selectedMother =
    mothers.find((mother) => mother.uid === selectedUid) ?? null;
  const records = recordsByMother[selectedUid] ?? EMPTY_RECORDS;
  const canManageStaff = session.status === "staff" && session.role === "admin";

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : "Sign-in failed. Check your credentials.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (session.status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-sm text-slate-500">Checking your account…</p>
      </main>
    );
  }

  if (session.status !== "staff") {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">
              BabyHealth Guard
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Health worker sign in
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Sign in with an authorized staff account to access patient records.
            </p>
          </div>

          {session.status === "unauthorized" && (
            <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              {session.message}
            </p>
          )}
          {dataError && (
            <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
              {dataError}
            </p>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                autoComplete="username"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                autoComplete="current-password"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            {loginError && (
              <p role="alert" className="text-sm text-rose-700">
                {loginError}
              </p>
            )}
            <button
              className="w-full rounded-lg bg-cyan-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="mt-5 text-xs leading-5 text-slate-500">
            Staff accounts must be provisioned with an approved role. Mother accounts
            cannot access this dashboard.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-800">
              BabyHealth Guard
            </p>
            <h1 className="mt-1 text-lg font-bold text-slate-900">
              Health worker dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">{session.name}</p>
              <p className="text-xs capitalize text-slate-500">
                {session.role.replaceAll("_", " ")} · {session.facility}
              </p>
            </div>
            <button
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => signOut(auth)}
              type="button"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6">
        {dataError && (
          <p role="alert" className="mb-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
            {dataError}
          </p>
        )}
        <nav aria-label="Dashboard sections" className="mb-5 flex gap-2 overflow-x-auto border-b border-slate-200">
          {(canManageStaff
            ? ([
                ["mothers", "Mothers"],
                ["staff", "Staff management"],
                ["settings", "Settings"],
                ["newborns", "Newborn care"],
                ["appointments", "Appointments"],
                ["referrals", "Referrals"],
                ["communications", "SMS & USSD"],
                ["reports", "Reports"],
              ] as const)
            : ([
                ["mothers", "Mothers"],
                ["newborns", "Newborn care"],
                ["appointments", "Appointments"],
                ["referrals", "Referrals"],
                ["communications", "SMS & USSD"],
                ["reports", "Reports"],
              ] as const)
          ).map(([view, label]) => (
            <button
              aria-current={activeView === view ? "page" : undefined}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${
                activeView === view
                  ? "border-cyan-800 text-cyan-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
              key={view}
              onClick={() => setActiveView(view)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        {activeView === "mothers" ? (
        <>
        <MotherRegistration facility={session.facility} />
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Registered mothers" value={isLoadingMothers ? "…" : mothers.length} />
          <SummaryCard label="Daily vital records" value={records.dailyVitals.length} />
          <SummaryCard label="Scheduled appointments" value={appointments.length} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.8fr)]">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900">Mother registry</h2>
              <input
                aria-label="Search mothers"
                className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, phone, village…"
                type="search"
                value={search}
              />
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {isLoadingMothers ? (
                <p className="p-5 text-sm text-slate-500">Loading mother profiles…</p>
              ) : filteredMothers.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">
                  {mothers.length === 0
                    ? "No mother profiles are available."
                    : "No mothers match this search."}
                </p>
              ) : (
                filteredMothers.map((mother) => (
                  <button
                    aria-current={mother.uid === selectedUid ? "true" : undefined}
                    className={`block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-cyan-50 ${
                      mother.uid === selectedUid ? "bg-cyan-50" : "bg-white"
                    }`}
                    key={mother.uid}
                    onClick={() => setSelectedUid(mother.uid)}
                    type="button"
                  >
                    <span className="block text-sm font-semibold text-slate-900">
                      {mother.fullName}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {[mother.village, mother.phone].filter(Boolean).join(" · ") ||
                        mother.email ||
                        "Contact details not recorded"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              {selectedMother ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800">
                    Mother profile
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {selectedMother.fullName}
                  </h2>
                  <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                    <ProfileField label="Age" value={selectedMother.age ? `${selectedMother.age} years` : "Not recorded"} />
                    <ProfileField label="Village" value={selectedMother.village || "Not recorded"} />
                    <ProfileField label="Phone" value={selectedMother.phone || "Not recorded"} />
                    <ProfileField label="Maternal status" value={selectedMother.maternalStatus} />
                    <ProfileField label="Pregnancy stage" value={selectedMother.pregnancyStage || "Not recorded"} />
                    <ProfileField label="Facility" value={selectedMother.facilityName || session.facility} />
                    <ProfileField label="Conditions" value={selectedMother.conditions.join(", ") || "None recorded"} />
                  </dl>
                  {canManageStaff && (
                    <MotherCareAssignment
                      key={`${selectedMother.uid}-${selectedMother.assignedStaffUid ?? ""}`}
                      mother={selectedMother}
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500">
                  Select a mother to review her care records.
                </p>
              )}
            </div>

            <RecordSection
              emptyText="No vital records have been recorded."
              records={records.dailyVitals}
              title="Daily vitals"
            />
            <RecordSection
              emptyText="No health logs have been recorded."
              records={records.healthLogs}
              title="Recent health logs"
            />
            <RecordSection
              emptyText="No appointments have been scheduled."
              records={records.appointments}
              title="Appointments"
            />
          </section>
        </div>
        </>
        ) : activeView === "staff" ? (
          canManageStaff ? <StaffManagement /> : null
        ) : activeView === "settings" ? (
          canManageStaff ? <AdminSettings /> : null
        ) : activeView === "appointments" ? (
          <AppointmentManager
            appointments={appointments}
            facility={session.facility}
            initialMotherUid={selectedUid}
            isLoading={isLoadingAppointments}
            mothers={mothers}
            staffName={session.name}
          />
        ) : activeView === "newborns" ? (
          <NewbornCare mothers={mothers} newborns={newborns} staffUid={session.user.uid} />
        ) : activeView === "referrals" ? (
          <Referrals
            facility={session.facility}
            mothers={mothers}
            referrals={referrals}
            staffName={session.name}
            staffUid={session.user.uid}
          />
        ) : activeView === "communications" ? (
          <Communications mothers={mothers} smsLogs={smsLogs} />
        ) : (
          <Reports
            appointments={appointments}
            facility={session.facility}
            mothers={mothers}
            newborns={newborns}
            referrals={referrals}
          />
        )}
      </div>
      <MaamaCareAssistant />
    </main>
  );
}

function MotherRegistration({ facility }: { facility: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    age: "",
    village: "",
    phone: "",
    language: "Luganda",
    maternalStatus: "expecting",
    pregnancyStage: "4 - 6 Mo",
    parity: "First Baby (1st)",
    midwifeUid: "",
  });
  const [conditions, setConditions] = useState<string[]>(["None"]);
  const [midwives, setMidwives] = useState<MidwifeOption[]>([]);
  const conditionOptions = ["None", "High BP", "Anemia", "Other"];

  useEffect(() => {
    let active = true;
    const loadMidwives = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/midwives", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await response.json()) as {
          midwives?: MidwifeOption[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not load midwives.");
        }
        if (active) setMidwives(payload.midwives ?? []);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Could not load midwives.");
        }
      }
    };
    void loadMidwives();
    return () => {
      active = false;
    };
  }, []);

  function toggleCondition(condition: string) {
    setConditions((current) => {
      if (condition === "None") return ["None"];
      const selected = current.filter((value) => value !== "None");
      const updated = selected.includes(condition)
        ? selected.filter((value) => value !== condition)
        : [...selected, condition];
      return updated.length ? updated : ["None"];
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      setError("Sign in with an approved staff account to register a mother.");
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/mothers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          age: Number(form.age),
          pregnancyStage: form.maternalStatus === "expecting" ? form.pregnancyStage : "",
          conditions,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not register the mother.");
      }

      setNotice(
        `Mother profile created${facility && facility !== "Health facility" ? ` at ${facility}` : ""}. No sign-in account was created.`,
      );
      setForm({
        fullName: "",
        email: "",
        age: "",
        village: "",
        phone: "",
        language: "Luganda",
        maternalStatus: "expecting",
        pregnancyStage: "4 - 6 Mo",
        parity: "First Baby (1st)",
        midwifeUid: "",
      });
      setConditions(["None"]);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register the mother.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mb-5 rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Mother registration</h2>
          <p className="mt-1 text-sm text-slate-600">
            Register a mother who does not have a smartphone. This creates a care profile, not a login account.
          </p>
        </div>
        <button
          className="rounded-lg bg-cyan-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-900"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          {isOpen ? "Close form" : "Register mother"}
        </button>
      </div>

      {error && <p role="alert" className="mx-4 mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="mx-4 mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      {isOpen && (
        <form className="space-y-5 border-t border-slate-100 p-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
              Full name
              <input
                autoComplete="name"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                maxLength={120}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                required
                value={form.fullName}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Age
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                max={120}
                min={10}
                onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))}
                required
                type="number"
                value={form.age}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Village
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                maxLength={120}
                onChange={(event) => setForm((current) => ({ ...current, village: event.target.value }))}
                required
                value={form.village}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Phone (Uganda)
              <div className="mt-1.5 flex overflow-hidden rounded-lg border border-slate-300">
                <span className="bg-slate-50 px-3 py-2.5 text-sm text-slate-600">+256</span>
                <input
                  className="min-w-0 flex-1 px-3 py-2.5"
                  inputMode="numeric"
                  maxLength={9}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value.replace(/\D/g, "") }))}
                  pattern="[0-9]{9}"
                  placeholder="7XXXXXXXX"
                  required
                  value={form.phone}
                />
              </div>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Email (optional)
              <input
                autoComplete="email"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                type="email"
                value={form.email}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Preferred language for SMS alerts
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}
                value={form.language}
              >
                {["Luganda", "English", "Swahili"].map((language) => (
                  <option key={language} value={language}>{language}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Current maternal status
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    maternalStatus: event.target.value,
                    pregnancyStage: event.target.value === "expecting" ? current.pregnancyStage || "4 - 6 Mo" : "",
                  }))
                }
                value={form.maternalStatus}
              >
                <option value="expecting">Expecting</option>
                <option value="baby">Newborn baby</option>
              </select>
            </label>
            {form.maternalStatus === "expecting" && (
              <label className="text-sm font-medium text-slate-700">
                Pregnancy stage
                <select
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                  onChange={(event) => setForm((current) => ({ ...current, pregnancyStage: event.target.value }))}
                  value={form.pregnancyStage}
                >
                  {["1 - 3 Mo", "4 - 6 Mo", "7 - 9 Mo"].map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-sm font-medium text-slate-700">
              Number of births (parity)
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                onChange={(event) => setForm((current) => ({ ...current, parity: event.target.value }))}
                value={form.parity}
              >
                <option value="First Baby (1st)">First Baby (1st)</option>
                <option value="2nd or More">2nd or More</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Assigned midwife (optional)
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                onChange={(event) => setForm((current) => ({ ...current, midwifeUid: event.target.value }))}
                value={form.midwifeUid}
              >
                <option value="">No midwife assigned</option>
                {midwives.map((midwife) => (
                  <option key={midwife.uid} value={midwife.uid}>
                    {midwife.fullName}{midwife.facilityName ? ` · ${midwife.facilityName}` : ""}
                  </option>
                ))}
              </select>
              {midwives.length === 0 && (
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  No active midwives are currently listed.
                </span>
              )}
            </label>
            {form.midwifeUid && (
              <label className="text-sm font-medium text-slate-700">
                Midwife phone number
                <input
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-slate-600"
                  readOnly
                  value={
                    midwives.find((midwife) => midwife.uid === form.midwifeUid)?.phone ??
                    "Phone not recorded"
                  }
                />
              </label>
            )}
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Known health conditions</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {conditionOptions.map((condition) => {
                const checked = conditions.includes(condition);
                return (
                  <label
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                      checked ? "border-cyan-700 bg-cyan-50 text-cyan-900" : "border-slate-300 text-slate-700"
                    }`}
                    key={condition}
                  >
                    <input
                      checked={checked}
                      className="sr-only"
                      onChange={() => toggleCondition(condition)}
                      type="checkbox"
                    />
                    {condition}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">
              Facility recorded on this profile: {facility || "Not assigned"}
            </p>
            <button
              className="rounded-lg bg-cyan-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving profile…" : "Save mother profile"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function StaffManagement() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState<string>("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "doctor",
    facilityId: "",
  });

  const currentUserUid = auth.currentUser?.uid ?? "";

  const loadStaffMembers = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/staff", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json()) as { staff?: StaffMember[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load staff accounts.");
      }
      setStaffMembers(payload.staff ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load staff accounts.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFacilities = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/facilities", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as {
        facilities?: FacilityOption[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load facilities.");
      }
      setFacilities(payload.facilities ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load facilities.";
      setError(message);
    }
  }, []);

  useEffect(() => {
    const runLoad = async () => {
      await Promise.all([loadStaffMembers(), loadFacilities()]);
    };
    void runLoad();
  }, [loadFacilities, loadStaffMembers]);

  async function handleCreateStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      setError("You need to be signed in to add staff.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setNotice("");

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: form.role,
          facilityId: form.facilityId,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not create the staff account.");
      }
      setNotice(`Staff member ${form.fullName} was added successfully.`);
      setForm({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        role: "doctor",
        facilityId: "",
      });
      setIsFormOpen(false);
      await loadStaffMembers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create the staff account.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRoleChange(member: StaffMember, role: string) {
    const user = auth.currentUser;
    if (!user) return;
    setPendingAction(`${member.uid}-role`);
    setError("");
    setNotice("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: member.uid, role }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not update the staff role.");
      }
      setNotice(`${member.fullName}'s role was updated to ${role}.`);
      await loadStaffMembers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update the staff role.";
      setError(message);
    } finally {
      setPendingAction("");
    }
  }

  async function handleAccessToggle(member: StaffMember) {
    if (member.uid === currentUserUid) {
      setError("You cannot disable your own administrator account.");
      return;
    }
    const user = auth.currentUser;
    if (!user) return;
    setPendingAction(`${member.uid}-toggle`);
    setError("");
    setNotice("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: member.uid, disabled: !member.disabled }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not update staff access.");
      }
      setNotice(
        member.disabled
          ? `${member.fullName} was reactivated.`
          : `${member.fullName} was deactivated.`,
      );
      await loadStaffMembers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update staff access.";
      setError(message);
    } finally {
      setPendingAction("");
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Staff management</h2>
          <p className="mt-1 text-sm text-slate-600">
            Manage authorized clinical staff and secure dashboard access.
          </p>
        </div>
        <button
          className="rounded-lg bg-cyan-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-900"
          onClick={() => setIsFormOpen((current) => !current)}
          type="button"
        >
          {isFormOpen ? "Close form" : "Add staff member"}
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      {isFormOpen && (
        <form className="space-y-4 rounded-xl border border-slate-200 bg-white p-5" onSubmit={handleCreateStaff}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Full name
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                required
                type="text"
                value={form.fullName}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
                type="email"
                value={form.email}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Phone number
              <input
                autoComplete="tel"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                required
                type="tel"
                value={form.phone}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                minLength={8}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
                type="password"
                value={form.password}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Role
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                value={form.role}
              >
                {STAFF_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              Facility
              <select
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                disabled={facilities.length === 0}
                onChange={(event) => setForm((current) => ({ ...current, facilityId: event.target.value }))}
                required
                value={form.facilityId}
              >
                <option value="" disabled>
                  {facilities.length === 0 ? "Add facilities in Settings first" : "Select a facility"}
                </option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end">
            <button
              className="rounded-lg bg-cyan-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || facilities.length === 0}
              type="submit"
            >
              {isSubmitting ? "Creating…" : "Create staff account"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-5 text-sm text-slate-500">Loading staff accounts…</p>
          ) : staffMembers.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No staff accounts have been added yet.</p>
          ) : (
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Facility</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffMembers.map((member) => (
                  <tr key={member.uid} className="align-top">
                    <td className="px-4 py-3 font-medium text-slate-900">{member.fullName}</td>
                    <td className="px-4 py-3">{member.email}</td>
                    <td className="px-4 py-3">{member.phone || "Not recorded"}</td>
                    <td className="px-4 py-3">
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                        disabled={pendingAction !== ""}
                        onChange={(event) => handleRoleChange(member, event.target.value)}
                        value={member.role}
                      >
                        {STAFF_ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {member.facilityName || member.facilityId || "Not assigned"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          member.disabled
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {member.disabled ? "Disabled" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {member.uid === currentUserUid ? (
                        <span className="text-xs text-slate-500">Current user</span>
                      ) : (
                        <button
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                            member.disabled
                              ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              : "border-rose-200 text-rose-700 hover:bg-rose-50"
                          }`}
                          disabled={pendingAction !== ""}
                          onClick={() => handleAccessToggle(member)}
                          type="button"
                        >
                          {pendingAction === `${member.uid}-toggle`
                            ? member.disabled
                              ? "Reactivating…"
                              : "Deactivating…"
                            : member.disabled
                              ? "Reactivate"
                              : "Deactivate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}

function AdminSettings() {
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [facilityName, setFacilityName] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [pendingFacilityId, setPendingFacilityId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadFacilities = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/facilities", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as {
        facilities?: FacilityOption[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load facilities.");
      }
      setFacilities(payload.facilities ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load facilities.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const runLoad = async () => {
      await loadFacilities();
    };
    void runLoad();
  }, [loadFacilities]);

  async function handleAddFacility(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      setError("You need to be signed in to manage facilities.");
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/facilities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: facilityName }),
      });
      const payload = (await response.json()) as {
        facility?: FacilityOption;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not add the facility.");
      }
      setFacilityName("");
      setNotice(`${payload.facility?.name ?? "Facility"} added.`);
      await loadFacilities();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add the facility.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateFacility(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user || !editingId) {
      setError("Select a facility to edit.");
      return;
    }

    setPendingFacilityId(editingId);
    setError("");
    setNotice("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/facilities", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: editingId, name: editingName }),
      });
      const payload = (await response.json()) as {
        facility?: FacilityOption;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not update the facility.");
      }
      setNotice(`${payload.facility?.name ?? "Facility"} updated.`);
      setEditingId("");
      setEditingName("");
      await loadFacilities();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update the facility.";
      setError(message);
    } finally {
      setPendingFacilityId("");
    }
  }

  async function handleDeleteFacility(facility: FacilityOption) {
    if (!window.confirm(`Delete "${facility.name}"? This cannot be undone.`)) return;
    const user = auth.currentUser;
    if (!user) {
      setError("You need to be signed in to manage facilities.");
      return;
    }

    setPendingFacilityId(facility.id);
    setError("");
    setNotice("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/facilities", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: facility.id }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not delete the facility.");
      }
      if (editingId === facility.id) {
        setEditingId("");
        setEditingName("");
      }
      setNotice(`${facility.name} deleted.`);
      await loadFacilities();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not delete the facility.";
      setError(message);
    } finally {
      setPendingFacilityId("");
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Settings</h2>
        <p className="mt-1 text-sm text-slate-600">
          Add the hospitals and health facilities where staff work. These are used in staff registration.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      <form
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end"
        onSubmit={handleAddFacility}
      >
        <label className="block flex-1 text-sm font-medium text-slate-700">
          Facility name
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            maxLength={120}
            onChange={(event) => setFacilityName(event.target.value)}
            placeholder="e.g. Kanyanya Health Centre"
            required
            value={facilityName}
          />
        </label>
        <button
          className="rounded-lg bg-cyan-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Adding…" : "Add facility"}
        </button>
      </form>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="font-semibold text-slate-900">Registered facilities</h3>
        </div>
        {isLoading ? (
          <p className="p-5 text-sm text-slate-500">Loading facilities…</p>
        ) : facilities.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">
            No facilities have been added. Add one above to enable staff registration.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {facilities.map((facility) => (
              <li
                className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                key={facility.id}
              >
                {editingId === facility.id ? (
                  <form
                    className="flex flex-1 flex-col gap-2 sm:flex-row"
                    onSubmit={handleUpdateFacility}
                  >
                    <input
                      aria-label="Facility name"
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      maxLength={120}
                      onChange={(event) => setEditingName(event.target.value)}
                      required
                      value={editingName}
                    />
                    <button
                      className="rounded-lg bg-cyan-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      disabled={pendingFacilityId !== ""}
                      type="submit"
                    >
                      {pendingFacilityId === facility.id ? "Saving…" : "Save"}
                    </button>
                    <button
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                      disabled={pendingFacilityId !== ""}
                      onClick={() => {
                        setEditingId("");
                        setEditingName("");
                      }}
                      type="button"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="text-sm font-medium text-slate-800">{facility.name}</span>
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        disabled={pendingFacilityId !== ""}
                        onClick={() => {
                          setEditingId(facility.id);
                          setEditingName(facility.name);
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        disabled={pendingFacilityId !== ""}
                        onClick={() => handleDeleteFacility(facility)}
                        type="button"
                      >
                        {pendingFacilityId === facility.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <SmsBilling />
      <UssdRequests />
    </section>
  );
}

const APPOINTMENT_TYPES = [
  { value: "ANTENATAL", label: "Antenatal care" },
  { value: "DELIVERY", label: "Delivery planning" },
  { value: "POSTNATAL", label: "Postnatal care" },
  { value: "IMMUNIZATION", label: "Newborn immunization" },
];

const REMINDER_INTERVALS = [
  { minutes: 5, label: "5 minutes before" },
  { minutes: 30, label: "30 minutes before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 720, label: "12 hours before" },
  { minutes: 1440, label: "24 hours before" },
];

type AppointmentFilter = "ALL" | "TODAY" | "MISSED";

function AppointmentManager({
  appointments,
  mothers,
  initialMotherUid,
  staffName,
  facility,
  isLoading,
}: {
  appointments: AppointmentRecord[];
  mothers: MotherProfile[];
  initialMotherUid: string;
  staffName: string;
  facility: string;
  isLoading: boolean;
}) {
  const [filter, setFilter] = useState<AppointmentFilter>("ALL");
  const [search, setSearch] = useState("");
  const [motherUid, setMotherUid] = useState(initialMotherUid);
  const [type, setType] = useState(APPOINTMENT_TYPES[0].value);
  const [scheduledAt, setScheduledAt] = useState(() => defaultAppointmentDate());
  const [reminderMinutes, setReminderMinutes] = useState(60);
  const [sendSms, setSendSms] = useState(false);
  const [clinic, setClinic] = useState(facility);
  const [agenda, setAgenda] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedMotherUid = mothers.some((mother) => mother.uid === motherUid)
    ? motherUid
    : "";
  const selectedMother = mothers.find((mother) => mother.uid === selectedMotherUid);
  const scheduledDate = new Date(scheduledAt);
  const remainingMilliseconds = scheduledDate.getTime() - currentTime.getTime();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const missedCount = appointments.filter((appointment) => {
    const date = appointmentDate(appointment);
    return (
      date !== null &&
      date < todayStart &&
      !["completed", "cancelled", "missed"].includes(appointmentStatus(appointment))
    );
  }).length;
  const todayCount = appointments.filter((appointment) => {
    const date = appointmentDate(appointment);
    return date !== null && date >= todayStart && date < todayEnd;
  }).length;
  const visibleAppointments = appointments.filter((appointment) => {
    const date = appointmentDate(appointment);
    const status = appointmentStatus(appointment);
    const matchesFilter =
      filter === "ALL" ||
      (filter === "TODAY" && date !== null && date >= todayStart && date < todayEnd) ||
      (filter === "MISSED" &&
        date !== null &&
        date < todayStart &&
        !["completed", "cancelled", "missed"].includes(status));
    const searchText = [
      appointment.motherName,
      appointment.motherPhone,
      appointment.values.clinic,
      appointment.values.type,
      appointment.values.agenda,
    ]
      .filter((value): value is string => typeof value === "string")
      .join(" ")
      .toLowerCase();
    return matchesFilter && searchText.includes(search.trim().toLowerCase());
  });

  async function handleSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setNotice("");
    const date = new Date(scheduledAt);
    if (!selectedMotherUid || Number.isNaN(date.getTime())) {
      setFormError("Select a mother and a valid appointment date.");
      return;
    }
    if (date <= new Date()) {
      setFormError("Choose a date and time in the future.");
      return;
    }
    if (sendSms && reminderMinutes * 60_000 > date.getTime() - Date.now()) {
      setFormError("Choose a shorter reminder interval or a later appointment time.");
      return;
    }
    if (sendSms && !selectedMother?.phone) {
      setFormError("This mother has no phone number on her profile. Add it or turn off appointment SMS.");
      return;
    }
    setIsSaving(true);
    try {
      const result = await createMotherAppointment({
        motherUid: selectedMotherUid,
        scheduledAt: date,
        type,
        clinic: clinic.trim() || facility,
        agenda: agenda.trim(),
        staffName,
        reminderMinutes,
        sendSms,
      });
      setMotherUid("");
      setType(APPOINTMENT_TYPES[0].value);
      setScheduledAt(defaultAppointmentDate());
      setReminderMinutes(60);
      setSendSms(false);
      setClinic("");
      setAgenda("");
      setNotice(
        result.confirmationStatus === "accepted"
          ? "Appointment saved. Africa's Talking accepted the confirmation SMS; the selected reminder is queued."
          : result.confirmationStatus === "failed"
            ? "Appointment saved, but the confirmation SMS was not accepted. Check SMS activity and server configuration."
            : "Appointment saved without SMS. The selected reminder is not scheduled.",
      );
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not schedule the appointment.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(appointment: AppointmentRecord, status: string) {
    setActionError("");
    setUpdatingId(appointment.id);
    try {
      await updateMotherAppointmentStatus(appointment.motherUid, appointment.id, status);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Could not update appointment status.",
      );
    } finally {
      setUpdatingId("");
    }
  }

  function downloadTodaysSchedule() {
    const rows = [
      ["Mother", "Phone", "Visit type", "Date and time", "Clinic", "Status"],
      ...appointments
        .filter((appointment) => {
          const date = appointmentDate(appointment);
          return date !== null && date >= todayStart && date < todayEnd;
        })
        .map((appointment) => [
          appointment.motherName,
          appointment.motherPhone,
          stringValue(appointment.values.type),
          appointmentDate(appointment)?.toLocaleString() ?? "",
          stringValue(appointment.values.clinic),
          appointmentStatus(appointment),
        ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `clinic-schedule-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Visits &amp; reminders</h2>
          <p className="mt-1 text-sm text-slate-600">
            Schedule clinic visits and track appointment status.
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
          onClick={downloadTodaysSchedule}
          type="button"
        >
          Download today&apos;s schedule
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="All appointments" value={appointments.length} />
        <SummaryCard label="Scheduled today" value={todayCount} />
        <SummaryCard label="Follow-up needed" value={missedCount} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="space-y-4 border-b border-slate-200 p-4">
            <div className="flex flex-wrap gap-2">
              {([
                ["ALL", `All (${appointments.length})`],
                ["TODAY", `Today (${todayCount})`],
                ["MISSED", `Missed (${missedCount})`],
              ] as const).map(([value, label]) => (
                <button
                  aria-pressed={filter === value}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    filter === value
                      ? "bg-cyan-800 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  key={value}
                  onClick={() => setFilter(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              aria-label="Search appointments"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search mother, phone, visit, or clinic…"
              type="search"
              value={search}
            />
          </div>
          {actionError && (
            <p role="alert" className="mx-4 mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
              {actionError}
            </p>
          )}
          {isLoading ? (
            <p className="p-5 text-sm text-slate-500">Loading appointments…</p>
          ) : visibleAppointments.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">
              {appointments.length === 0
                ? "No appointments have been scheduled."
                : "No appointments match this filter."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visibleAppointments.map((appointment) => {
                const status = appointmentStatus(appointment);
                const date = appointmentDate(appointment);
                return (
                  <li
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                    key={`${appointment.motherUid}-${appointment.id}`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{appointment.motherName}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {stringValue(appointment.values.type, "Clinic visit")}
                        {appointment.motherPhone ? ` · ${appointment.motherPhone}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {date?.toLocaleString() ?? "Date not recorded"} ·{" "}
                        {stringValue(appointment.values.clinic, "Clinic not recorded")}
                      </p>
                      {typeof appointment.values.agenda === "string" &&
                        appointment.values.agenda && (
                          <p className="mt-1 text-sm text-slate-500">
                            {appointment.values.agenda}
                          </p>
                        )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold capitalize text-cyan-900">
                        {status.replaceAll("_", " ")}
                      </span>
                      {status !== "completed" && status !== "cancelled" && (
                        <>
                          <button
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            disabled={updatingId === appointment.id}
                            onClick={() => handleStatusChange(appointment, "completed")}
                            type="button"
                          >
                            {updatingId === appointment.id ? "Saving…" : "Complete"}
                          </button>
                          <button
                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                            disabled={updatingId === appointment.id}
                            onClick={() => handleStatusChange(appointment, "cancelled")}
                            type="button"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <form
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
          onSubmit={handleSchedule}
        >
          <div>
            <h3 className="font-semibold text-slate-900">Book a visit</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Appointment data is saved to the mother&apos;s Firestore profile. SMS is optional and requires verified consent.
            </p>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Mother
            <select
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              onChange={(event) => setMotherUid(event.target.value)}
              required
              value={selectedMotherUid}
            >
              <option value="">Select a mother</option>
              {mothers.map((mother) => (
                <option key={mother.uid} value={mother.uid}>
                  {mother.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Reminder time (if SMS is enabled)
            <select
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              onChange={(event) => setReminderMinutes(Number(event.target.value))}
              value={reminderMinutes}
            >
              {REMINDER_INTERVALS.map((option) => (
                <option
                  disabled={sendSms && option.minutes * 60_000 > remainingMilliseconds}
                  key={option.minutes}
                  value={option.minutes}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              checked={sendSms}
              className="mt-1"
              onChange={(event) => setSendSms(event.target.checked)}
              type="checkbox"
            />
            <span>
              Send confirmation now and schedule the selected reminder. I have confirmed the mother consented to SMS.
              {selectedMother && !selectedMother.phone && (
                <span className="mt-1 block text-xs text-amber-800">No phone number is recorded for this mother.</span>
              )}
            </span>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Visit type
            <select
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
              onChange={(event) => setType(event.target.value)}
              value={type}
            >
              {APPOINTMENT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Date and time
            <input
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              min={new Date(
                currentTime.getTime() - currentTime.getTimezoneOffset() * 60_000,
              ).toISOString().slice(0, 16)}
              onChange={(event) => setScheduledAt(event.target.value)}
              required
              type="datetime-local"
              value={scheduledAt}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Clinic
            <input
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              onChange={(event) => setClinic(event.target.value)}
              value={clinic}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Visit notes
            <textarea
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              onChange={(event) => setAgenda(event.target.value)}
              rows={3}
              value={agenda}
            />
          </label>
          {formError && <p role="alert" className="text-sm text-rose-700">{formError}</p>}
          {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
          <button
            className="w-full rounded-lg bg-cyan-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving || mothers.length === 0}
            type="submit"
          >
            {isSaving ? "Scheduling…" : "Schedule appointment"}
          </button>
        </form>
      </div>
    </section>
  );
}

function defaultAppointmentDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(9, 0, 0, 0);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function appointmentDate(appointment: AppointmentRecord): Date | null {
  const value = appointment.values.scheduledAt;
  return value instanceof Date
    ? value
    : value && typeof value === "object" && "toDate" in value &&
        typeof value.toDate === "function"
      ? value.toDate()
      : null;
}

function appointmentStatus(appointment: AppointmentRecord): string {
  const status = stringValue(appointment.values.status, "scheduled").toLowerCase();
  const date = appointmentDate(appointment);
  if (
    date &&
    date < new Date(new Date().setHours(0, 0, 0, 0)) &&
    !["completed", "cancelled", "missed"].includes(status)
  ) {
    return "missed";
  }
  return status;
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function RecordSection({
  title,
  records,
  emptyText,
}: {
  title: string;
  records: CareRecord[];
  emptyText: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      {records.length === 0 ? (
        <p className="px-5 py-4 text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {records.slice(0, 8).map((record) => (
            <li className="flex flex-wrap justify-between gap-2 px-5 py-3" key={record.id}>
              <span className="text-sm font-medium capitalize text-slate-800">
                {recordSummary(record)}
              </span>
              <span className="text-xs text-slate-500">
                {displayDate(
                  record.values.updatedAt ??
                    record.values.createdAt ??
                    record.values.scheduledAt,
                )}
              </span>
              {typeof record.values.systolic === "number" &&
                typeof record.values.diastolic === "number" && (
                  <span className="w-full text-xs text-slate-600">
                    BP {record.values.systolic}/{record.values.diastolic}
                    {typeof record.values.kicks === "number" &&
                      ` · ${record.values.kicks} kicks`}
                    {typeof record.values.ironTaken === "boolean" &&
                      ` · Iron ${record.values.ironTaken ? "taken" : "not taken"}`}
                  </span>
                )}
              {typeof record.values.sign === "string" && (
                <span className="w-full text-xs text-slate-600">
                  Reported sign: {record.values.sign}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
