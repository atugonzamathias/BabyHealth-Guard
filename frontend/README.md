# BabyHealth Guard Health Worker Dashboard

The Next.js dashboard in `src/` supports staff sign-in, mother records, newborn care,
appointments, referrals, SMS messaging, a live USSD callback, and operational reports.

## Current web-app behavior

### Settings and USSD

Settings is divided into **USSD visit requests**, **SMS billing & top up**, and
**Facilities** tabs. USSD requests are shown first. Option 2 collects a visit
type (Antenatal, Delivery, Postnatal, or Immunization); only administrators can
schedule or decline requests. Approval uses a dialog with locked,
server-derived mother, phone, facility, and visit-type fields. Declines require
a reason, and both outcomes send an SMS to the mother.

Option 3 records danger signs and severity in the mother's `healthLogs` and
creates a facility-scoped emergency triage report and notifies the assigned
staff member by SMS. Assigned staff can acknowledge the alert, log a referral
from the triage modal, optionally notify the mother and receiving desk by
single-segment SMS, and resolve it after safe transfer. Referral details are
audited in the mother's `healthLogs` and copied into the mother's `referrals`
collection so they appear in the web app's Referrals tab. USSD appointments use the standard
`users/{motherUid}/appointments/{appointmentId}` path, preserve the selected
local time through epoch milliseconds, and resolve the actual active midwife
server-side.

### Enter record

The **Enter record** dashboard tab supports staff who are recording care for a
mother who does not use the mobile app. It mirrors the mobile app's writable
care activities:

- daily blood pressure and kick totals;
- additional kick counts;
- iron and folic acid taken/not-taken status;
- danger sign, severity, and description.

`POST /api/mother-records` re-loads the mother with the shared authorization
layer before writing. It writes facility and staff attribution to the daily
vitals or health-log record, so staff cannot use the browser to record data for
a different facility. Appointments, newborn records, referrals, and SMS already
have dedicated staff dashboard surfaces.

### Facility authorization

The `admin` role is global and can access all mothers, including legacy mothers
without a facility, so they can assign them safely. `system_admin` is a compatible
global role. All other approved staff are restricted to their own valid facility.
Records without `facilityId` are denied to non-admin staff. Server routes load
authorization data from `users/{uid}` and do not trust browser-supplied role,
facility, mother, or staff values. Firestore rules provide the client-side
enforcement boundary.

### SMS integration

The shared SMS helper is used by `/api/sms`, `/api/appointments`,
`/api/sms/reminders`, and USSD notifications. It normalizes Uganda numbers to
E.164, omits `from` unless `AT_SENDER_ID` is configured, and limits every message
to one GSM-7 segment of at most 160 septets. Dynamic names, facilities, dates,
and phone numbers are shortened as needed. The complete Africa's Talking
recipient response (`status`, `statusCode`, and `messageId`) is written to both
SMS log paths and server logs.

Appointment confirmations and reminders use Firestore idempotency flags
(`confirmationSmsSent` and `reminderSmsSent`) to prevent duplicate sends.
Configure Africa's Talking delivery callbacks as:

```text
https://<your-domain>/api/sms/delivery?token=<SMS_DELIVERY_CALLBACK_SECRET>
```

Configure an external scheduler to call `POST /api/sms/reminders` with
`Authorization: Bearer <SMS_REMINDER_CRON_SECRET>` at least once per minute.
The reminder route is not scheduled automatically by Next.js.

## Run locally

1. Copy `.env.example` to `.env.local` and configure the Firebase Web App and
   server-only values. Revoke and replace any Firebase service-account key or
   Africa's Talking key that has been shared publicly.
   For Firebase Admin credentials, save the replacement JSON as
   `frontend/firebase-admin-service-account.json` and set
   `FIREBASE_ADMIN_SERVICE_ACCOUNT_FILE=./firebase-admin-service-account.json`
   in `.env.local`. That file is ignored by Git. Alternatively, set
   `FIREBASE_ADMIN_SERVICE_ACCOUNT` to the full JSON value.
2. Enable Email/Password sign-in in Firebase Authentication.
3. Create staff accounts in Firebase Authentication and provision matching
   `users/{uid}` documents with an approved `role` (`doctor`, `admin`, `health_worker`,
   `nurse`, `midwife`, or `system_admin`). Staff roles must not be assigned by public
   self-registration. Every approved staff profile must also contain a valid
   `facilityId` and `facilityName`.
4. From the repository root, deploy the Firestore rules and indexes with
   `firebase deploy --only firestore:rules,firestore:indexes`.
5. From `frontend/`, run `npm install` and `npm run dev`.

The dashboard reads mother profiles from `users/{uid}` documents where
`role == "mother"`, then listens to each selected profile's `dailyVitals`,
`healthLogs`, and `appointments` subcollections. Those fields follow the Flutter
`MotherProfile`, `DailyVitals`, `HealthLog`, and `Appointment` models.

The staff dashboard includes MaamaCare, a scripted assistant using the legacy
12-language reply catalog. It supports quick questions, browser text-to-speech,
and optional English voice input when the browser supports speech recognition.
Voice input may be processed by the browser's speech service. Replies are general
information, not a diagnosis; urgent symptoms require immediate clinical care.

Administrators can add facility names in the dashboard's **Settings** tab.
Facility names are stored in the Firestore `facilities` collection and are
required selections when creating staff accounts. New facilities receive
sequential IDs such as `FAC-001`, which are stored as the facility document ID
and in each assigned staff profile. Staff accounts include a phone number;
active midwife profiles publish only their name, phone, and facility in the
read-only `staffDirectory` collection for registration and mobile calling.

The `admin` role is the global administrator role: it may view all mothers,
including legacy profiles without a facility or assigned staff, and assign those
mothers to staff. `system_admin` remains accepted as a compatible global role.
Other staff roles are restricted to their own facility. Records without a valid
`facilityId` remain unavailable to non-admin staff; an administrator should assign
the mother to a validated staff member, which writes the mother's facility
assignment. Do not infer a facility from `facilityName` alone.

Any approved staff member can register a mother from the **Mothers** tab using
the Flutter app's `MotherProfile` fields. Staff-entered profiles are saved with
`role: "mother"` and the staff member's facility; no Firebase Authentication
account is created, so the mother does not need a smartphone or email address.
Administrators can assign any active staff member with a valid phone number as
the care-team contact from a mother's profile. The assignment is saved on the
mother profile and used by the mobile app's call/SMS actions. A staff account
cannot be disabled while assigned; reassign or clear the mother's contact first.

Newborn records, check-up history, referrals, appointments, and SMS logs are stored
in the mother's Firestore subcollections. Live SMS and appointment mutations use
staff-authenticated Next.js API routes and Firebase Admin SDK on the server. Phone
numbers are read from the mother profile; the browser never supplies the recipient.
The **SMS & USSD** screen provides live staff-initiated SMS; mothers use the
Africa's Talking short code for USSD. Africa's Talking acceptance is not carrier
delivery confirmation. Outbound SMS uses only the server-side
`AFRICASTALKING_USERNAME` and `AFRICASTALKING_API_KEY`; the app does not set a sender
ID. Sending without a custom sender ID still depends on Africa's Talking account
permissions and destination-country rules. When a mother has an assigned staff
member with a name and phone, every outbound SMS includes that contact and the
staff member's current facility when available.
Messages are rendered as one GSM-7 segment with a maximum of 160 septets;
unsupported characters are replaced with `?`, and dynamic details are shortened
before sending. Set `AT_SENDER_ID` only after registering that sender ID with
Africa's Talking; when it is empty, the request omits `from` and uses the
provider's default sender.
Configure Africa's Talking to post delivery reports to
`/api/sms/delivery?token=<SMS_DELIVERY_CALLBACK_SECRET>`. The callback updates each
matching SMS log with the provider's final delivery status. A message shown as
**Pending delivery** means Africa's Talking accepted the submission but has not yet
reported delivery; it is not treated as delivered.

Administrators can monitor the live Africa's Talking balance, SMS counts, recent
activity, and estimated costs in **Settings → SMS billing & usage**. The billing
API requires an admin account and keeps provider credentials on the server. Costs
are estimates at UGX 25 per SMS segment; GSM-7 and Unicode segment capacities are
accounted for, and estimated remaining messages assumes one segment per message.

The reminder route is `POST /api/sms/reminders`; configure an external scheduler to
call it with `Authorization: Bearer <SMS_REMINDER_CRON_SECRET>`. Reminders do not
run until a scheduler is configured. See the repository root `README.md` for the
environment-variable setup and deployment steps.

Never put service-account credentials, `AFRICASTALKING_API_KEY`, or the scheduler
secret in `NEXT_PUBLIC_*` variables or browser code.

## Africa's Talking USSD callback

Set the callback URL in Africa's Talking to
`https://babyhealth-guard.onrender.com/api/ussd` and the service code to
`*384*24073#`. The public `POST /api/ussd` route accepts form-encoded gateway
requests and returns `CON`/`END` plain-text responses with HTTP 200. It uses
Firebase Admin credentials and the existing server-only Africa's Talking username
and API key. Mothers are matched from `users/{uid}` documents with `role: "mother"`;
visit requests are queued in `ussd_requests` for admins in **Settings**, and urgent
reports are written to the mother's `healthLogs` and sent by SMS to assigned staff
when a valid phone is available.
