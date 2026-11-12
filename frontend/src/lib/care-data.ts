import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";

export type MotherProfile = {
  uid: string;
  fullName: string;
  email: string;
  age: number | null;
  village: string;
  phone: string;
  language: string;
  maternalStatus: string;
  pregnancyStage: string;
  parity: string;
  conditions: string[];
  facilityName: string;
  midwifeName?: string;
  midwifePhone?: string;
  assignedStaffUid?: string;
  assignedStaffName?: string;
  assignedStaffPhone?: string;
  assignedStaffRole?: string;
  assignedStaffFacilityName?: string;
};

export type CareRecord = {
  id: string;
  values: Record<string, unknown>;
};

export type AppointmentRecord = CareRecord & {
  motherUid: string;
  motherName: string;
  motherPhone: string;
};

export type MotherScopedRecord = CareRecord & {
  motherUid: string;
  motherName: string;
};

function watchRecordsForMothers(
  mothers: MotherProfile[],
  collectionName: "appointments" | "newborns" | "referrals" | "smsLogs",
  onData: (records: MotherScopedRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const recordsByMother = new Map<string, MotherScopedRecord[]>();
  const unresolved = new Set(mothers.map((mother) => mother.uid));
  const emit = () => {
    onData(
      Array.from(recordsByMother.values())
        .flat()
        .sort((left, right) => recordDate(right.values) - recordDate(left.values)),
    );
  };
  const subscriptions = mothers.map((mother) =>
    onSnapshot(
      query(
        collection(db, "users", mother.uid, collectionName),
        orderBy(
          collectionName === "appointments"
            ? "scheduledAt"
            : collectionName === "referrals"
              ? "createdAt"
              : collectionName === "smsLogs"
                ? "createdAt"
                : "createdAt",
          collectionName === "appointments" ? "asc" : "desc",
        ),
      ),
      (snapshot) => {
        recordsByMother.set(
          mother.uid,
          snapshot.docs.map((record) => ({
            id: record.id,
            motherUid: mother.uid,
            motherName: mother.fullName,
            values: record.data(),
          })),
        );
        unresolved.delete(mother.uid);
        if (unresolved.size === 0) emit();
      },
      (error) => {
        unresolved.delete(mother.uid);
        onError(error);
        if (unresolved.size === 0) emit();
      },
    ),
  );
  if (mothers.length === 0) onData([]);
  return () => subscriptions.forEach((unsubscribe) => unsubscribe());
}

function recordDate(values: Record<string, unknown>): number {
  const candidate = values.scheduledAt ?? values.createdAt ?? values.updatedAt;
  if (candidate instanceof Timestamp) return candidate.toMillis();
  if (candidate instanceof Date) return candidate.getTime();
  return 0;
}

function motherFromData(uid: string, data: DocumentData): MotherProfile {
  return {
    uid,
    fullName: typeof data.fullName === "string" ? data.fullName : "Unnamed mother",
    email: typeof data.email === "string" ? data.email : "",
    age: typeof data.age === "number" ? data.age : null,
    village: typeof data.village === "string" ? data.village : "",
    phone:
      typeof data.phone === "string"
        ? data.phone
        : typeof data.phoneNumber === "string"
          ? data.phoneNumber
          : "",
    language: typeof data.language === "string" ? data.language : "",
    maternalStatus:
      typeof data.maternalStatus === "string" ? data.maternalStatus : "expecting",
    pregnancyStage:
      typeof data.pregnancyStage === "string" ? data.pregnancyStage : "",
    parity: typeof data.parity === "string" ? data.parity : "",
    conditions: Array.isArray(data.conditions)
      ? data.conditions.filter((value): value is string => typeof value === "string")
      : [],
    facilityName: typeof data.facilityName === "string" ? data.facilityName : "",
    midwifeName: typeof data.midwifeName === "string" ? data.midwifeName : undefined,
    midwifePhone: typeof data.midwifePhone === "string" ? data.midwifePhone : undefined,
    assignedStaffUid:
      typeof data.assignedStaffUid === "string" ? data.assignedStaffUid : undefined,
    assignedStaffName:
      typeof data.assignedStaffName === "string" ? data.assignedStaffName : undefined,
    assignedStaffPhone:
      typeof data.assignedStaffPhone === "string" ? data.assignedStaffPhone : undefined,
    assignedStaffRole:
      typeof data.assignedStaffRole === "string" ? data.assignedStaffRole : undefined,
    assignedStaffFacilityName:
      typeof data.assignedStaffFacilityName === "string"
        ? data.assignedStaffFacilityName
        : undefined,
  };
}

function recordsFromSnapshot(
  snapshot: { docs: Array<{ id: string; data: () => DocumentData }> },
): CareRecord[] {
  return snapshot.docs.map((record) => ({
    id: record.id,
    values: record.data(),
  }));
}

async function authenticatedApiRequest<T>(
  path: string,
  method: "POST" | "PATCH",
  payload: Record<string, unknown>,
): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in with an approved staff account.");
  const response = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const result = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(result.error ?? "The server could not complete this request.");
  }
  return result;
}

export function watchMothers(
  onData: (mothers: MotherProfile[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const mothersQuery = query(
    collection(db, "users"),
    where("role", "==", "mother"),
  );

  return onSnapshot(
    mothersQuery,
    (snapshot) =>
      onData(
        snapshot.docs
          .map((profile) => motherFromData(profile.id, profile.data()))
          .sort((left, right) => left.fullName.localeCompare(right.fullName)),
      ),
    (error) => onError(error),
  );
}

export function watchMotherRecords(
  motherUid: string,
  collectionName: "dailyVitals" | "healthLogs" | "appointments",
  onData: (records: CareRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const sortField =
    collectionName === "dailyVitals"
      ? "updatedAt"
      : collectionName === "appointments"
        ? "scheduledAt"
        : "createdAt";
  const direction = collectionName === "appointments" ? "asc" : "desc";
  const recordsQuery = query(
    collection(db, "users", motherUid, collectionName),
    orderBy(sortField, direction),
  );

  return onSnapshot(
    recordsQuery,
    (snapshot) => onData(recordsFromSnapshot(snapshot)),
    (error) => onError(error),
  );
}

export function watchAppointmentsForMothers(
  mothers: MotherProfile[],
  onData: (appointments: AppointmentRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return watchRecordsForMothers(
    mothers,
    "appointments",
    (records) =>
      onData(records.map((record) => ({
        ...record,
        motherPhone:
          mothers.find((mother) => mother.uid === record.motherUid)?.phone ?? "",
      }))),
    onError,
  );
}

export function watchNewbornsForMothers(
  mothers: MotherProfile[],
  onData: (records: MotherScopedRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return watchRecordsForMothers(mothers, "newborns", onData, onError);
}

export function watchReferralsForMothers(
  mothers: MotherProfile[],
  onData: (records: MotherScopedRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return watchRecordsForMothers(mothers, "referrals", onData, onError);
}

export function watchSmsLogsForMothers(
  mothers: MotherProfile[],
  onData: (records: MotherScopedRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return watchRecordsForMothers(mothers, "smsLogs", onData, onError);
}

export function watchNewbornCheckups(
  motherUid: string,
  newbornId: string,
  onData: (records: CareRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "users", motherUid, "newborns", newbornId, "checkups"),
      orderBy("recordedAt", "desc"),
    ),
    (snapshot) => onData(recordsFromSnapshot(snapshot)),
    onError,
  );
}

export async function createNewbornRecord({
  motherUid,
  name,
  birthDate,
  birthWeightKg,
  currentWeightKg,
  temperatureC,
  respiratoryRate,
  feeding,
  kmcHours,
  cordStatus,
  immunizationStatus,
  followUpPriority,
  notes,
  createdBy,
}: {
  motherUid: string;
  name: string;
  birthDate: Date;
  birthWeightKg: number | null;
  currentWeightKg: number | null;
  temperatureC: number | null;
  respiratoryRate: number | null;
  feeding: string;
  kmcHours: number | null;
  cordStatus: string;
  immunizationStatus: string;
  followUpPriority: string;
  notes: string;
  createdBy: string;
}): Promise<void> {
  const newborns = collection(db, "users", motherUid, "newborns");
  const newbornRef = doc(newborns);
  const record = {
    name,
    birthDate: Timestamp.fromDate(birthDate),
    birthWeightKg,
    currentWeightKg,
    temperatureC,
    respiratoryRate,
    feeding,
    kmcHours,
    cordStatus,
    immunizationStatus,
    followUpPriority,
    notes,
    status: followUpPriority,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const batch = writeBatch(db);
  batch.set(newbornRef, record);
  batch.set(doc(collection(newbornRef, "checkups")), {
    currentWeightKg,
    temperatureC,
    respiratoryRate,
    feeding,
    kmcHours,
    cordStatus,
    immunizationStatus,
    followUpPriority,
    notes,
    recordedBy: createdBy,
    recordedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function updateNewbornCheckup(
  motherUid: string,
  newbornId: string,
  values: {
    currentWeightKg: number | null;
    temperatureC: number | null;
    respiratoryRate: number | null;
    feeding: string;
    kmcHours: number | null;
    cordStatus: string;
    immunizationStatus: string;
    followUpPriority: string;
    notes: string;
  },
  staffUid: string,
): Promise<void> {
  const newbornRef = doc(db, "users", motherUid, "newborns", newbornId);
  const batch = writeBatch(db);
  batch.update(newbornRef, {
    ...values,
    status: values.followUpPriority,
    lastCheckedAt: serverTimestamp(),
    updatedBy: staffUid,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(collection(newbornRef, "checkups")), {
    ...values,
    recordedBy: staffUid,
    recordedAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function createReferralRecord({
  motherUid,
  patientName,
  patientType,
  reason,
  destination,
  receivingUnit,
  receivingContact,
  urgency,
  notes,
  staffUid,
}: {
  motherUid: string;
  patientName: string;
  patientType: "mother" | "newborn";
  reason: string;
  destination: string;
  receivingUnit: string;
  receivingContact: string;
  urgency: "routine" | "urgent" | "emergency";
  notes: string;
  staffUid: string;
}): Promise<void> {
  await addDoc(collection(db, "users", motherUid, "referrals"), {
    patientName,
    patientType,
    reason,
    destination,
    receivingUnit,
    receivingContact,
    urgency,
    notes,
    status: "referred",
    createdBy: staffUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateReferralStatus(
  motherUid: string,
  referralId: string,
  status: string,
): Promise<void> {
  await updateDoc(doc(db, "users", motherUid, "referrals", referralId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function createMotherAppointment({
  motherUid,
  scheduledAt,
  type,
  clinic,
  agenda,
  staffName,
  reminderMinutes,
  sendSms,
}: {
  motherUid: string;
  scheduledAt: Date;
  type: string;
  clinic: string;
  agenda: string;
  staffName: string;
  reminderMinutes: number;
  sendSms: boolean;
}): Promise<{ confirmationStatus: "accepted" | "failed" | "disabled" }> {
  return authenticatedApiRequest("/api/appointments", "POST", {
    motherUid,
    scheduledAtMillis: scheduledAt.getTime(),
    type,
    clinic,
    agenda,
    staffName,
    reminderMinutes,
    sendSms,
    smsConsentConfirmed: sendSms,
  });
}

export async function sendSmsToMother(
  motherUid: string,
  message: string,
  category: string,
  consentConfirmed: boolean,
): Promise<void> {
  const result = await authenticatedApiRequest<{ accepted: boolean }>(
    "/api/sms",
    "POST",
    { motherUid, message, category, consentConfirmed },
  );
  if (!result.accepted) {
    throw new Error("Africa's Talking did not accept the SMS. Check the SMS activity log.");
  }
}

export async function updateMotherAppointmentStatus(
  motherUid: string,
  appointmentId: string,
  status: string,
): Promise<void> {
  await authenticatedApiRequest("/api/appointments", "PATCH", {
    motherUid,
    appointmentId,
    status,
  });
}

export function watchUserProfile(
  uid: string,
  onData: (profile: DocumentData | undefined) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "users", uid),
    (snapshot) => onData(snapshot.exists() ? snapshot.data() : undefined),
    (error) => onError(error),
  );
}
