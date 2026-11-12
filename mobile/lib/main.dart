import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/data/auth_repository.dart';
import 'features/auth/presentation/screens/login_screen.dart';
import 'features/auth/presentation/screens/mother_registration_screen.dart';
import 'features/dashboard/data/care_repository.dart';
import 'features/dashboard/presentation/screens/mother_dashboard_screen.dart';
import 'features/onboarding/presentation/screens/welcome_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase using the generated configuration options
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  FirebaseFirestore.instance.settings =
  const Settings(persistenceEnabled: false);

  // Set system UI overlay style matching modern edge-to-edge mobile designs
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  runApp(const BabyHealthGuardApp());
}

class BabyHealthGuardApp extends StatelessWidget {
  const BabyHealthGuardApp({super.key});

  @override
  Widget build(BuildContext context) {
    final authRepository = AuthRepository();
    final careRepository = CareRepository();

    return MaterialApp(
      title: 'BabyHealth Guard',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: AuthGate(
        authRepository: authRepository,
        careRepository: careRepository,
      ),
      routes: {
        '/welcome': (context) => const WelcomeScreen(),
        '/register': (context) => const MotherRegistrationScreen(),
        '/login': (context) => const LoginScreen(),
      },
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({
    required this.authRepository,
    required this.careRepository,
    super.key,
  });

  final AuthRepository authRepository;
  final CareRepository careRepository;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder(
      stream: authRepository.authStateChanges,
      builder: (context, authSnapshot) {
        if (authSnapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (authSnapshot.hasError) {
          return const WelcomeScreen();
        }
        final user = authSnapshot.data;
        if (user == null) return const WelcomeScreen();

        return StreamBuilder(
          stream: careRepository.watchProfile(user.uid),
          builder: (context, profileSnapshot) {
            if (profileSnapshot.connectionState == ConnectionState.waiting) {
              return const Scaffold(
                body: Center(child: CircularProgressIndicator()),
              );
            }
            if (profileSnapshot.hasError) {
              return _AuthGateMessage(
                message:
                'We could not load your profile. Check your connection and try again.',
                onPressed: () => authRepository.signOut(),
                actionLabel: 'Sign out',
              );
            }
            final profile = profileSnapshot.data;
            if (profile == null) {
              return const MotherRegistrationScreen();
            }
            return MotherDashboardScreen(
              profile: profile,
              onSignOut: authRepository.signOut,
              careRepository: careRepository,
            );
          },
        );
      },
    );
  }
}

class _AuthGateMessage extends StatelessWidget {
  const _AuthGateMessage({
    required this.message,
    required this.onPressed,
    required this.actionLabel,
  });

  final String message;
  final Future<void> Function() onPressed;
  final String actionLabel;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(message, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: onPressed,
                child: Text(actionLabel),
              ),
            ],
          ),
        ),
      ),
    );
  }
}