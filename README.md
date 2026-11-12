# BabyHealth Guard

Digital maternal and newborn health monitoring system (MVP).

## Frontend (health-worker dashboard)
- The migrated Next.js/TypeScript dashboard is in `frontend/src/`; `frontend/index.html` remains as a legacy behavior/layout reference.
- Configure Firebase Web values in `frontend/.env.local` using `frontend/.env.example` as a template.
- From `frontend/`, run `npm install` and `npm run dev`.
- The Next.js dashboard supports Firebase staff sign-in, mother records, newborn care, appointment management, patient referrals, SMS messaging, USSD simulation, and operational analytics.
- Staff accounts must be provisioned in Firebase Authentication with a corresponding `users/{uid}` profile containing an approved staff `role`. Public staff self-registration is not enabled.
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
`SMS_REMINDER_CRON_SECRET` there. Set the same values as server-side environment
variables on the Next.js hosting provider. These values must not use a
`NEXT_PUBLIC_` prefix or be committed. The key previously shared in chat should be
revoked and rotated before live sending.

The staff-authenticated `/api/sms` route loads the mother's phone from Firestore,
requires the staff member to confirm consent, sends via Africa's Talking, and logs
provider acceptance/failure in `users/{motherUid}/smsLogs`. Appointment creation and
status updates are also handled server-side. The protected
`POST /api/sms/reminders` endpoint processes due appointment reminders; configure an
external scheduler to call it with `Authorization: Bearer <SMS_REMINDER_CRON_SECRET>`
(for example, once per minute). A Next.js API route is not itself a scheduler, so
reminders will not run until a scheduler is configured. Provider acceptance is not
proof of handset delivery. USSD remains a local simulator.

Deploy only Firestore rules and indexes with:

```powershell
firebase deploy --only firestore:rules,firestore:indexes
```

The Firestore rules remain role-scoped for health-data privacy. Do not replace them
with a catch-all authenticated read/write rule: mothers and staff must not be able
to access every user's records.
