import 'package:babyhealth_guard_mobile/features/dashboard/data/care_repository.dart';
import 'package:babyhealth_guard_mobile/features/dashboard/domain/mother_profile.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('profile stream receives admin care-team assignment updates', () async {
    final firestore = FakeFirebaseFirestore();
    final repository = CareRepository(firestore: firestore);
    final profileRef = firestore.collection('users').doc('mother-1');
    await profileRef.set({
      'fullName': 'Amina Brenda',
      'role': 'mother',
      'facilityName': 'Registration Facility',
    });

    final profileUpdates = expectLater(
      repository.watchProfile('mother-1'),
      emitsInOrder([
        isA<MotherProfile>()
            .having((profile) => profile.assignedStaffUid, 'assigned staff UID',
                isNull)
            .having((profile) => profile.facilityName, 'mother facility',
                'Registration Facility'),
        isA<MotherProfile>()
            .having((profile) => profile.assignedStaffUid, 'assigned staff UID',
                'staff-1')
            .having((profile) => profile.assignedStaffName,
                'assigned staff name', 'Assigned Midwife')
            .having((profile) => profile.assignedStaffPhone,
                'assigned staff phone', '+256762653272')
            .having((profile) => profile.assignedStaffFacilityName,
                'assigned staff facility', 'Assigned Health Centre'),
      ]),
    );

    await profileRef.update({
      'assignedStaffUid': 'staff-1',
      'assignedStaffName': 'Assigned Midwife',
      'assignedStaffPhone': '+256762653272',
      'assignedStaffRole': 'midwife',
      'assignedStaffFacilityName': 'Assigned Health Centre',
    });

    await profileUpdates;
  });
}
