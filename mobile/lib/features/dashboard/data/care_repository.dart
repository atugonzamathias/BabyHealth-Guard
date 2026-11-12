import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/constants/app_strings.dart';
import '../domain/mother_profile.dart';

class CareRepository {
  CareRepository({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  DocumentReference<Map<String, dynamic>> _profile(String uid) =>
      _firestore.collection(AppStrings.usersCollection).doc(uid);

  CollectionReference<Map<String, dynamic>> _vitals(String uid) =>
      _profile(uid).collection(AppStrings.dailyVitalsCollection);

  CollectionReference<Map<String, dynamic>> _healthLogs(String uid) =>
      _profile(uid).collection(AppStrings.healthLogsCollection);

  Stream<List<MidwifeDirectoryEntry>> watchMidwives() {
    return _firestore
        .collection(AppStrings.staffDirectoryCollection)
        .where('role', isEqualTo: 'midwife')
        .where('active', isEqualTo: true)
        .snapshots()
        .map(
          (snapshot) => snapshot.docs
              .map(MidwifeDirectoryEntry.fromSnapshot)
              .where((midwife) => midwife.fullName.trim().isNotEmpty)
              .toList()
            ..sort((left, right) => left.fullName.compareTo(right.fullName)),
        );
  }

  Stream<MotherProfile?> watchProfile(String uid) {
    return _profile(uid).snapshots().map(
          (snapshot) =>
              snapshot.exists ? MotherProfile.fromSnapshot(snapshot) : null,
        );
  }

  Stream<DailyVitals> watchDailyVitals(String uid, DateTime day) {
    return _vitals(uid).doc(_dayKey(day)).snapshots().map(
          (snapshot) => DailyVitals.fromSnapshot(snapshot, day),
        );
  }

  Stream<List<Appointment>> watchAppointments(String uid) {
    return _profile(uid)
        .collection(AppStrings.appointmentsCollection)
        .orderBy('scheduledAt')
        .snapshots()
        .map(
          (snapshot) => snapshot.docs
              .map(Appointment.fromSnapshot)
              .toList(growable: false),
        );
  }

  Stream<List<HealthLog>> watchHealthLogs(String uid) {
    return _healthLogs(uid)
        .orderBy('createdAt', descending: true)
        .limit(10)
        .snapshots()
        .map(
          (snapshot) =>
              snapshot.docs.map(HealthLog.fromSnapshot).toList(growable: false),
        );
  }

  Future<void> saveProfile({required MotherProfile profile}) async {
    await _profile(profile.uid).set({
      'fullName': profile.fullName,
      'email': profile.email,
      'age': profile.age,
      'village': profile.village,
      'phone': profile.phone,
      'language': profile.language,
      'maternalStatus': profile.maternalStatus,
      'pregnancyStage': profile.pregnancyStage,
      'parity': profile.parity,
      'conditions': profile.conditions,
      'role': profile.role,
      'midwifeName': profile.midwifeName,
      'midwifePhone': profile.midwifePhone,
      'facilityName': profile.facilityName,
      'updatedAt': FieldValue.serverTimestamp(),
      'createdAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  Future<void> saveVitals({
    required String uid,
    required DateTime day,
    required int? systolic,
    required int? diastolic,
    required int kicks,
  }) async {
    final batch = _firestore.batch();
    final vitalsRef = _vitals(uid).doc(_dayKey(day));
    batch.set(
      vitalsRef,
      {
        'day': Timestamp.fromDate(DateTime(day.year, day.month, day.day)),
        'systolic': systolic,
        'diastolic': diastolic,
        'kicks': kicks,
        'updatedAt': FieldValue.serverTimestamp(),
      },
      SetOptions(merge: true),
    );
    batch.set(_healthLogs(uid).doc(), {
      'type': 'vitals_recorded',
      'systolic': systolic,
      'diastolic': diastolic,
      'kicks': kicks,
      'createdAt': FieldValue.serverTimestamp(),
    });
    await batch.commit();
  }

  Future<void> logKick(String uid, DateTime day) async {
    final vitalsRef = _vitals(uid).doc(_dayKey(day));
    await _firestore.runTransaction((transaction) async {
      final snapshot = await transaction.get(vitalsRef);
      final current = (snapshot.data()?['kicks'] as num?)?.toInt() ?? 0;
      final next = current + 1;
      transaction.set(
        vitalsRef,
        {
          'day': Timestamp.fromDate(DateTime(day.year, day.month, day.day)),
          'kicks': next,
          'updatedAt': FieldValue.serverTimestamp(),
        },
        SetOptions(merge: true),
      );
      transaction.set(_healthLogs(uid).doc(), {
        'type': 'kick_logged',
        'total': next,
        'createdAt': FieldValue.serverTimestamp(),
      });
    });
  }

  Future<void> setIronTaken({
    required String uid,
    required DateTime day,
    required bool taken,
  }) async {
    final batch = _firestore.batch();
    batch.set(
      _vitals(uid).doc(_dayKey(day)),
      {
        'day': Timestamp.fromDate(DateTime(day.year, day.month, day.day)),
        'ironTaken': taken,
        'updatedAt': FieldValue.serverTimestamp(),
      },
      SetOptions(merge: true),
    );
    batch.set(_healthLogs(uid).doc(), {
      'type': 'iron_folic_updated',
      'taken': taken,
      'createdAt': FieldValue.serverTimestamp(),
    });
    await batch.commit();
  }

  Future<void> logDangerSign({
    required String uid,
    required String sign,
    required String description,
  }) {
    return _healthLogs(uid).add({
      'type': 'danger_sign_reported',
      'sign': sign,
      'description': description,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  String _dayKey(DateTime day) => '${day.year.toString().padLeft(4, '0')}-'
      '${day.month.toString().padLeft(2, '0')}-'
      '${day.day.toString().padLeft(2, '0')}';
}
