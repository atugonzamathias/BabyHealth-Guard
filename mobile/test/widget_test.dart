import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:babyhealth_guard_mobile/core/constants/app_colors.dart';
import 'package:babyhealth_guard_mobile/features/onboarding/presentation/widgets/get_started_button.dart';
import 'package:babyhealth_guard_mobile/features/onboarding/presentation/screens/welcome_screen.dart';

void main() {
  testWidgets('Welcome screen renders properly smoke test',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: WelcomeScreen()));

    // Verify Welcome title and Login button text exist
    expect(find.text('Welcome to\nBabyHealth Guard'), findsOneWidget);
    expect(find.text('Login'), findsOneWidget);
    expect(find.byType(GetStartedButton), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(GetStartedButton),
        matching: find.byWidgetPredicate(
          (widget) =>
              widget is Container &&
              widget.decoration is BoxDecoration &&
              (widget.decoration! as BoxDecoration).color == AppColors.primary,
        ),
      ),
      findsOneWidget,
    );
    expect(find.text('Secure care records'), findsOneWidget);
  });
}
