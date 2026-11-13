# BabyHealth Guard Health Worker Dashboard

The Next.js dashboard in `src/` supports staff sign-in, mother records, newborn care,
appointments, referrals, SMS messaging, USSD simulation, and operational reports.

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
   `nurse`, or `midwife`). Staff roles must not be assigned by public self-registration.
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
The SMS/USSD screen keeps USSD as a local simulator. Africa's Talking acceptance is
not carrier delivery confirmation. Outbound SMS uses only the server-side
`AFRICASTALKING_USERNAME` and `AFRICASTALKING_API_KEY`; the app does not set a sender
ID. Sending without a custom sender ID still depends on Africa's Talking account
permissions and destination-country rules. When a mother has an assigned staff
member with a name and phone, every outbound SMS includes that contact and the
staff member's current facility when available.

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
