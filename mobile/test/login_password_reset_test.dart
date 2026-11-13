import 'package:babyhealth_guard_mobile/features/auth/data/auth_repository.dart';
import 'package:babyhealth_guard_mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:babyhealth_guard_mobile/core/constants/app_colors.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeAuthService implements AuthService {
  String? resetEmail;
  FirebaseAuthException? resetError;

  @override
  Future<void> sendPasswordResetEmail({required String email}) async {
    if (resetError != null) throw resetError!;
    resetEmail = email;
  }

  @override
  Future<UserCredential> signIn({
    required String email,
    required String password,
  }) async {
    throw UnimplementedError();
  }
}

void main() {
  testWidgets('Forgot password sends reset email and confirms delivery',
      (WidgetTester tester) async {
    final authService = _FakeAuthService();
    await tester.pumpWidget(
      MaterialApp(home: LoginScreen(authService: authService)),
    );

    final inputDecorations =
        tester.widgetList<InputDecorator>(find.byType(InputDecorator)).toList();
    expect(inputDecorations, hasLength(2));
    for (final input in inputDecorations) {
      expect(input.decoration.enabledBorder, isA<OutlineInputBorder>());
      expect(input.decoration.focusedBorder, isA<OutlineInputBorder>());
      expect(input.decoration.filled, isTrue);
      expect(input.decoration.fillColor, Colors.white);
      expect(
        (input.decoration.enabledBorder as OutlineInputBorder).borderSide.color,
        AppColors.stone400,
      );
    }

    final passwordField = find.byType(TextFormField).last;
    final forgotPasswordLink = find.text('Forgot password?');
    expect(
      tester.getTopLeft(forgotPasswordLink).dy,
      greaterThan(tester.getBottomLeft(passwordField).dy),
    );
    await tester.enterText(
        find.byType(TextFormField).first, 'mama@example.com');
    await tester.tap(forgotPasswordLink);
    await tester.pumpAndSettle();

    expect(find.text('Reset your password'), findsOneWidget);
    expect(
      tester
          .widgetList<TextFormField>(find.byType(TextFormField))
          .last
          .controller
          ?.text,
      'mama@example.com',
    );

    await tester.tap(find.text('Send reset link'));
    await tester.pumpAndSettle();

    expect(authService.resetEmail, 'mama@example.com');
    expect(
      find.text(
        'If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('Forgot password validates the email before sending',
      (WidgetTester tester) async {
    final authService = _FakeAuthService();
    await tester.pumpWidget(
      MaterialApp(home: LoginScreen(authService: authService)),
    );

    await tester.tap(find.text('Forgot password?'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Send reset link'));
    await tester.pumpAndSettle();

    expect(find.text('Email is required'), findsOneWidget);
    expect(authService.resetEmail, isNull);
  });

  testWidgets('Forgot password reports network failures',
      (WidgetTester tester) async {
    final authService = _FakeAuthService()
      ..resetError = FirebaseAuthException(code: 'network-request-failed');
    await tester.pumpWidget(
      MaterialApp(home: LoginScreen(authService: authService)),
    );

    await tester.tap(find.text('Forgot password?'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).last, 'mama@example.com');
    await tester.tap(find.text('Send reset link'));
    await tester.pumpAndSettle();

    expect(
      find.text(
        'Could not connect. Check your internet connection and try again.',
      ),
      findsOneWidget,
    );
  });
}
