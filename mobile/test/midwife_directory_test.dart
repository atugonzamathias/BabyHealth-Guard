import 'package:babyhealth_guard_mobile/features/dashboard/data/care_repository.dart';
import 'package:babyhealth_guard_mobile/features/dashboard/domain/mother_profile.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('registration directory provides midwife contact details', () async {
    final firestore = FakeFirebaseFirestore();
    await firestore.collection('staffDirectory').doc('midwife-1').set({
      'fullName': 'Sarah Midwife',
      'phone': '+256 700 123456',
      'facilityName': 'Kagando Health Centre',
      'role': 'midwife',
      'active': true,
    });

    final midwives =
        await CareRepository(firestore: firestore).watchMidwives().first;

    expect(midwives, hasLength(1));
    expect(midwives.single.fullName, 'Sarah Midwife');
    expect(midwives.single.phone, '+256 700 123456');
    expect(midwives.single.facilityName, 'Kagando Health Centre');
  });

  test('mother profile persists selected midwife phone for calling', () async {
    final firestore = FakeFirebaseFirestore();
    const profile = MotherProfile(
      uid: 'mother-1',
      fullName: 'Amina Brenda',
      email: 'amina@example.com',
      age: 24,
      village: 'Kagando',
      phone: '+256 700 000000',
      language: 'Luganda',
      maternalStatus: 'expecting',
      pregnancyStage: '4 - 6 Mo',
      parity: 'First Baby (1st)',
      conditions: ['None'],
      midwifeName: 'Sarah Midwife',
      midwifePhone: '+256 700 123456',
      facilityName: 'Kagando Health Centre',
    );

    await CareRepository(firestore: firestore).saveProfile(profile: profile);
    final savedProfile =
        (await firestore.collection('users').doc('mother-1').get()).data();

    expect(savedProfile?['midwifeName'], 'Sarah Midwife');
    expect(savedProfile?['midwifePhone'], '+256 700 123456');
  });

  test('mother profile reads staff assignment and assigned phone', () {
    final profile = MotherProfile.fromMap('mother-1', {
      'fullName': 'Amina Brenda',
      'role': 'mother',
      'assignedStaffUid': 'nurse-1',
      'assignedStaffName': 'Sarah Nurse',
      'assignedStaffPhone': '+256 700 654321',
      'assignedStaffRole': 'nurse',
      'assignedStaffFacilityName': 'Kagando Health Centre',
    });

    expect(profile.assignedStaffUid, 'nurse-1');
    expect(profile.assignedStaffName, 'Sarah Nurse');
    expect(profile.assignedStaffPhone, '+256 700 654321');
    expect(profile.assignedStaffRole, 'nurse');
    expect(profile.assignedStaffFacilityName, 'Kagando Health Centre');
  });
}
