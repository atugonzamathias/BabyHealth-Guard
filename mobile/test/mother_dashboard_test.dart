import 'package:babyhealth_guard_mobile/features/dashboard/data/care_repository.dart';
import 'package:babyhealth_guard_mobile/features/dashboard/domain/mother_profile.dart';
import 'package:babyhealth_guard_mobile/features/dashboard/presentation/screens/mother_dashboard_screen.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Mother dashboard renders live profile and care records',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final firestore = FakeFirebaseFirestore();
    final today = DateTime.now();
    final dayKey = '${today.year.toString().padLeft(4, '0')}-'
        '${today.month.toString().padLeft(2, '0')}-'
        '${today.day.toString().padLeft(2, '0')}';
    await firestore
        .collection('users')
        .doc('mother-1')
        .collection('dailyVitals')
        .doc(dayKey)
        .set({
      'systolic': 118,
      'diastolic': 76,
      'kicks': 10,
      'ironTaken': true,
    });
    await firestore
        .collection('users')
        .doc('mother-1')
        .collection('appointments')
        .doc('visit-1')
        .set({
      'scheduledAt': Timestamp.fromDate(today.add(const Duration(days: 30))),
      'clinic': 'Kagando Health Centre',
      'status': 'Confirmed',
      'midwifeName': 'Care team',
      'midwifePhone': '+256700000000',
      'room': '2',
      'agenda': 'Routine check-up',
    });

    const profile = MotherProfile(
      uid: 'mother-1',
      fullName: 'Amina Brenda',
      email: 'amina@example.com',
      age: 24,
      village: 'Kagando',
      phone: '+256700000000',
      language: 'Luganda',
      maternalStatus: 'expecting',
      pregnancyStage: '4 - 6 Mo',
      parity: 'First Baby (1st)',
      conditions: ['None'],
      midwifeName: 'Registration Midwife',
      midwifePhone: '+256700000000',
      facilityName: 'Kagando Health Centre',
      assignedStaffUid: 'staff-1',
      assignedStaffName: 'Assigned Midwife',
      assignedStaffPhone: '+256762653272',
      assignedStaffRole: 'midwife',
      assignedStaffFacilityName: 'Assigned Health Centre',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: MotherDashboardScreen(
          profile: profile,
          onSignOut: () async {},
          careRepository: CareRepository(firestore: firestore),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Amina Brenda'), findsOneWidget);
    expect(find.text('Kagando'), findsOneWidget);
    expect(find.text('10 kicks'), findsOneWidget);
    expect(find.text('118 / 76'), findsOneWidget);
    expect(find.text('Iron & Folic'), findsOneWidget);
    expect(find.text('Assigned Midwife'), findsOneWidget);
    expect(find.text('Assigned Health Centre'), findsOneWidget);

    await tester.tap(find.text('+ Log Kick'));
    await tester.pumpAndSettle();
    expect(find.text('11 kicks'), findsOneWidget);

    await tester.tap(find.byTooltip('Open navigation menu'));
    await tester.pumpAndSettle();
    final drawer = find.byType(Drawer);
    expect(tester.getSize(drawer).width, 390 * 0.4);
    for (final icon in [
      Icons.home_rounded,
      Icons.health_and_safety_rounded,
      Icons.warning_amber_rounded,
      Icons.calendar_month_rounded,
    ]) {
      expect(
        find.descendant(of: drawer, matching: find.byIcon(icon)),
        findsOneWidget,
      );
    }
    await tester.tap(find.text('My Health').last);
    await tester.pumpAndSettle();
    expect(find.text("Today's Vitals"), findsOneWidget);
    expect(find.text('Blood Pressure'), findsOneWidget);
    expect(find.text('Baby Kicks'), findsOneWidget);
    expect(find.text('Care & Medication'), findsOneWidget);
    expect(find.text('Recent Health Activity'), findsOneWidget);
    expect(find.text("+ Record Today's Vitals"), findsOneWidget);

    await tester.tap(find.byTooltip('Open navigation menu'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Warning Signs').last);
    await tester.pumpAndSettle();
    expect(find.text('Danger Signs'), findsOneWidget);
    expect(find.text('Bleeding'), findsOneWidget);
    expect(find.text('Severe Headache'), findsOneWidget);
    expect(find.text('Baby Not Moving'), findsOneWidget);
    expect(find.text('High Fever'), findsOneWidget);

    await tester.tap(find.byTooltip('Open navigation menu'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Visits').last);
    await tester.pumpAndSettle();
    expect(find.text('Clinic Visits & Reminders'), findsOneWidget);
    expect(find.text('Kagando Health Centre'), findsOneWidget);
    expect(find.text('0 of 1 Done'), findsOneWidget);

    await tester.tap(find.text('MaamaCare'));
    await tester.pumpAndSettle();
    expect(find.text('MaamaCare Assistant'), findsOneWidget);
    expect(
        find.text(
            'General information only—not a diagnosis. If you may be in danger, seek care now or call 112.'),
        findsOneWidget);
    expect(find.text('Call emergency line 112'), findsOneWidget);
    await tester.tap(find.text("🚨 Obubonero obw'obulabe"));
    await tester.pumpAndSettle();
    expect(find.textContaining("⚠️ OBULABE OBW'AMANGU!"), findsOneWidget);

    await tester.enterText(
      find.byKey(const ValueKey('maamacare-question-input')),
      'I am bleeding',
    );
    await tester.tap(find.byTooltip('Send question'));
    await tester.pumpAndSettle();
    expect(find.text('I am bleeding'), findsOneWidget);
    expect(find.textContaining("⚠️ OBULABE OBW'AMANGU!"), findsOneWidget);

    await tester.tap(find.byTooltip('Close MaamaCare'));
    await tester.pumpAndSettle();
  });
}
