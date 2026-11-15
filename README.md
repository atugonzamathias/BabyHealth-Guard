# BabyHealth Guard

Digital maternal and newborn health monitoring system (MVP).

## Frontend (health-worker dashboard)

### Current web-app updates

The dashboard now enforces server-side facility isolation. The global `admin`
role (and compatible `system_admin`) can access all mothers, including legacy
profiles without a facility, so administrators can assign them safely. Other
approved staff can access only records belonging to their own valid facility.
Browser-supplied role, facility, mother, and staff values are not trusted.

Settings is organized into **USSD visit requests**, **SMS billing & top up**, and
**Facilities** tabs, with USSD requests shown first. USSD option 2 collects a
visit type, then administrators can schedule or decline the request in a dialog.
Declines require a reason and both outcomes notify the mother by SMS. Option 3
records danger signs and severity in `healthLogs` and notifies assigned staff.
The **Enter record** tab lets staff record the same mobile care activities on a
mother's behalf: daily blood pressure and kick totals, additional kick counts,
iron/folic adherence, and danger signs. The server re-checks the mother's
facility before writing both the canonical daily record and an auditable health
log with the staff member and facility metadata. Appointments, newborn care,
referrals, and SMS remain available in their existing dashboard tabs.

All SMS recipients are normalized to Uganda E.164 format. Messages are limited
to one GSM-7 segment of at most 160 septets, dynamic values are shortened, and
the optional `AT_SENDER_ID` is sent only when configured. Full Africa's Talking
recipient responses are stored in the SMS logs. Appointment confirmations and
reminders use Firestore idempotency flags to prevent duplicate sends.
- The migrated Next.js/TypeScript dashboard is in `frontend/src/`; `frontend/index.html` remains as a legacy behavior/layout reference.
- Configure Firebase Web values in `frontend/.env.local` using `frontend/.env.example` as a template.
- From `frontend/`, run `npm install` and `npm run dev`.
- The Next.js dashboard supports Firebase staff sign-in, mother records, newborn care, appointment management, patient referrals, SMS messaging, a live USSD callback, and operational analytics.
- Emergency danger-sign alerts are facility-scoped and recipient-scoped: assigned staff handle the alert, while global administrators handle unassigned alerts. The triage workflow supports acknowledgement, referral to a receiving facility with optional transport-desk SMS, and resolution with a permanent health-log audit.
- Emergency referrals created from the triage monitor are also written to `users/{motherUid}/referrals/{alertId}` with the receiving facility, transport contact, clinical notes, urgency, status, and staff attribution, so they appear in the dashboard's Referrals tab.
- Staff accounts must be provisioned in Firebase Authentication with a corresponding `users/{uid}` profile containing an approved staff `role`. Public staff self-registration is not enabled.
- Settings is organized into **USSD visit requests**, **SMS billing & top up**, and **Facilities** tabs; USSD requests are shown first.
- Deploy the access rules in `mobile/firestore.rules` before using real patient records.
- Live SMS and appointment writes use authenticated Next.js API routes. No Firebase Functions or Cloud Storage are required.

## Legacy backend
- `backend/` contains the Java 21 / Spring Boot API and PostgreSQL persistence implementation.
- `server.py` serves an in-memory demo API and the existing dashboard; `start_system.bat` still launches this legacy demo.
- These are retained as migration references and are not used by the new Next.js dashboard.

## Mobile (Flutter)
- Native Flutter application for mothers located in `mobile/`, using Firebase Authentication and Cloud Firestore.
- Firestore offline persistence is disabled; internet access is required for account and health-record operations.
- See [`mobile/README.md`](mobile/README.md) for Firebase setup, data structure, and run instructions.
- Run: `cd mobile && flutter pub get && flutter run`.

## Architecture
The mobile app and the Next.js dashboard use Firebase for authentication and care data. The Java backend and Python demo server are retained as legacy references while the web interface is migrated. See `documentation/` for the project proposal and requirements.

## Server-side API and SMS setup

Copy `frontend/.env.example` to `frontend/.env.local` and set the Firebase Admin
service-account JSON, `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY`, and
`SMS_REMINDER_CRON_SECRET`, `SMS_DELIVERY_CALLBACK_SECRET`, and optional
`AT_SENDER_ID` there. Set the same values as server-side environment
variables on the Next.js hosting provider. These values must not use a
`NEXT_PUBLIC_` prefix or be committed. Outbound SMS uses the Africa's Talking
username and API key. `AT_SENDER_ID` is optional; when empty, the app omits the
`from` parameter and uses Africa's Talking's default shared shortcode. Configure
only a registered sender ID.

The staff-authenticated `/api/sms` route loads the mother's phone from Firestore,
requires the staff member to confirm consent, sends via Africa's Talking, and logs
provider acceptance/failure in `users/{motherUid}/smsLogs`. When an assigned staff
member has a name and phone number, all outbound SMS include their contact details
and facility (when available); the current staff profile is fetched when sending.
Administrators can view the Africa's Talking wallet and estimated SMS usage in
**Settings**. The protected billing endpoint reads the live balance server-side and
combines new `sms_logs` entries with existing per-mother SMS history. Message costs
are estimates at UGX 25 per segment, using GSM-7 and Unicode SMS segment limits.
Appointment creation and status updates are also handled server-side. The protected
`POST /api/sms/reminders` endpoint processes due appointment reminders; configure an
external scheduler to call it with `Authorization: Bearer <SMS_REMINDER_CRON_SECRET>`
(for example, once per minute). A Next.js API route is not itself a scheduler, so
reminders will not run until a scheduler is configured. Provider acceptance is not
proof of handset delivery.

## Africa's Talking USSD setup

Configure the Africa's Talking USSD callback URL as
`https://babyhealth-guard.onrender.com/api/ussd` and use the service code
`*384*24073#`. The webhook is a public `POST` route that accepts Africa's Talking
form-encoded requests and always responds with plain text and HTTP 200. It uses
Firebase Admin credentials and the server-side `AFRICASTALKING_USERNAME` and
`AFRICASTALKING_API_KEY` values already required for SMS. Keep those credentials
server-only.

Mother lookup uses `users/{uid}` profiles with `role: "mother"` and their
international or local Uganda phone number. Visit requests are stored in the
`ussd_requests` collection and appear in the admin **Settings** tab. Danger signs
are recorded in each mother's `healthLogs`; an urgent SMS is sent to the assigned
staff phone when available. The **SMS & USSD** tab no longer includes a local
simulator; use the Africa's Talking short code on a phone to test the live callback.

Deploy only Firestore rules and indexes with:

```powershell
firebase deploy --only firestore:rules,firestore:indexes
```

The Firestore rules remain role-scoped for health-data privacy. Do not replace them
with a catch-all authenticated read/write rule: mothers and staff must not be able
to access every user's records.
