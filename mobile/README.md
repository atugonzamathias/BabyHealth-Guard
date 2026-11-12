# BabyHealth Guard Mobile

Flutter app for maternal and newborn care. Screens are native Flutter widgets; the HTML previews have been removed. The mobile app uses Firebase Authentication and Cloud Firestore. Firestore local persistence is disabled, so an internet connection is required to sign in and view or save care records.

## Project layout

```text
mobile/
├── firestore.rules
├── pubspec.yaml
└── lib/
    ├── main.dart
    ├── firebase_options.dart
    ├── core/
    │   ├── constants/       # Colors and collection names
    │   ├── theme/           # Material 3 theme
    │   └── utils/           # Form validators
    └── features/
        ├── onboarding/presentation/
        ├── auth/
        │   ├── data/        # Firebase Authentication repository
        │   └── presentation/screens/
        ├── dashboard/
        │   ├── data/        # Firestore care-record repository
        │   ├── domain/      # Profile, vital, appointment, and log models
        │   └── presentation/screens/
        ├── health_tracking/presentation/screens/
        └── danger_signs/presentation/screens/
```

## Firebase setup

1. Configure the Android app in Firebase and provide its generated Android and Dart configuration files.
2. Enable Email/Password in Firebase Authentication, configure the password reset email template and authorized domains, and create the Cloud Firestore database.
3. From the repository root, deploy `mobile/firestore.rules` and
   `firestore.indexes.json` before testing with real accounts.
4. Run `flutter pub get` and `flutter run`.

The app does not seed demo profiles, vitals, health logs, or appointments. Registration creates an auth account and a patient profile. Mothers can read their own appointments; creating or changing appointments is reserved for an authenticated health-worker account.

## Firestore data layout

- `users/{uid}`: patient profile fields such as name, age, village, phone, preferred language, maternal status, pregnancy stage, and conditions.
- `users/{uid}/dailyVitals/{yyyy-MM-dd}`: that day's blood pressure, kick count, and iron/folic status.
- `users/{uid}/healthLogs/{logId}`: append-only events for vital updates, kick counts, medication status, and reported danger signs.
- `users/{uid}/appointments/{appointmentId}`: scheduled clinic visits. The app reads these but cannot create or change them.
- `staffDirectory/{midwifeUid}`: limited active-midwife contact fields (`fullName`, `phone`, and `facilityName`) used by the registration dropdown and call/SMS actions. This directory is readable before registration and writable only through the server.

The shared Firestore rules allow mothers to access their own profiles and health records, and allow authenticated staff with an approved role in `users/{uid}` to access patient records. The public midwife directory is restricted to display/contact fields and is read-only to clients. An administrator should open Staff Management once after deployment to synchronize existing active midwives into it; new midwives and role/access changes update the directory automatically. Appointment creation, status changes, and outbound SMS use authenticated Next.js API routes; direct client writes for appointments and SMS logs are blocked. Newborn and referral records are stored under the mother's profile. These rules are an enforcement boundary, but they do not replace staff training, clinical protocols, or privacy safeguards. Deploy and review the rules before using real patient records.

Mother registration can select an active midwife from this directory. The chosen midwife's stored phone number is saved to the mother profile and used by the dashboard's call/SMS actions; emergency-call actions continue to use `112`.

On the sign-in screen, **Forgot password?** sends Firebase Authentication's password-reset email to the entered address. Check the Firebase Authentication email template and authorized domains in the Firebase Console if reset emails do not arrive.

The mother dashboard uses the administrator-assigned care-team staff member's saved phone number for its call/SMS actions, falling back to the midwife chosen at registration when no assignment has been made.

The mother dashboard includes MaamaCare, a locally matched scripted assistant with the legacy 12-language reply catalog, quick questions, text-to-speech, and optional English voice input. Voice input requires microphone permission and may be processed by the device speech service. Replies are informational, not a diagnosis; urgent symptoms should be taken to a health facility or reported using the emergency call action.

## Run checks

```sh
flutter analyze
flutter test
```
