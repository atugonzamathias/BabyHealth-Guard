import 'package:cloud_firestore/cloud_firestore.dart';

class MidwifeDirectoryEntry {
  const MidwifeDirectoryEntry({
    required this.uid,
    required this.fullName,
    required this.phone,
    required this.facilityName,
  });

  final String uid;
  final String fullName;
  final String phone;
  final String facilityName;

  factory MidwifeDirectoryEntry.fromSnapshot(
    QueryDocumentSnapshot<Map<String, dynamic>> snapshot,
  ) {
    final data = snapshot.data();
    return MidwifeDirectoryEntry(
      uid: snapshot.id,
      fullName: data['fullName'] as String? ?? '',
      phone: data['phone'] as String? ?? '',
      facilityName: data['facilityName'] as String? ?? '',
    );
  }
}

class MotherProfile {
  const MotherProfile({
    required this.uid,
    required this.fullName,
    required this.email,
    required this.age,
    required this.village,
    required this.phone,
    required this.language,
    required this.maternalStatus,
    required this.pregnancyStage,
    required this.parity,
    required this.conditions,
    this.role = 'mother',
    this.midwifeName,
    this.midwifePhone,
    this.facilityName,
    this.assignedStaffUid,
    this.assignedStaffName,
    this.assignedStaffPhone,
    this.assignedStaffRole,
    this.assignedStaffFacilityName,
  });

  final String uid;
  final String fullName;
  final String email;
  final int age;
  final String village;
  final String phone;
  final String language;
  final String maternalStatus;
  final String pregnancyStage;
  final String parity;
  final List<String> conditions;
  final String role;
  final String? midwifeName;
  final String? midwifePhone;
  final String? facilityName;
  final String? assignedStaffUid;
  final String? assignedStaffName;
  final String? assignedStaffPhone;
  final String? assignedStaffRole;
  final String? assignedStaffFacilityName;

  String get firstName => fullName.split(' ').first;

  factory MotherProfile.fromSnapshot(
    DocumentSnapshot<Map<String, dynamic>> snapshot,
  ) {
    final data = snapshot.data();
    if (data == null) {
      throw StateError('The signed-in user profile does not exist.');
    }
    return MotherProfile.fromMap(snapshot.id, data);
  }

  factory MotherProfile.fromMap(String uid, Map<String, dynamic> data) {
    return MotherProfile(
      uid: uid,
      fullName: data['fullName'] as String? ?? '',
      email: data['email'] as String? ?? '',
      age: (data['age'] as num?)?.toInt() ?? 0,
      village: data['village'] as String? ?? '',
      phone: data['phone'] as String? ?? '',
      language: data['language'] as String? ?? '',
      maternalStatus: data['maternalStatus'] as String? ?? 'expecting',
      pregnancyStage: data['pregnancyStage'] as String? ?? '',
      parity: data['parity'] as String? ?? '',
      conditions: List<String>.from(data['conditions'] as List? ?? const []),
      role: data['role'] as String? ?? 'mother',
      midwifeName: data['midwifeName'] as String?,
      midwifePhone: data['midwifePhone'] as String?,
      facilityName: data['facilityName'] as String?,
      assignedStaffUid: data['assignedStaffUid'] as String?,
      assignedStaffName: data['assignedStaffName'] as String?,
      assignedStaffPhone: data['assignedStaffPhone'] as String?,
      assignedStaffRole: data['assignedStaffRole'] as String?,
      assignedStaffFacilityName: data['assignedStaffFacilityName'] as String?,
    );
  }
}

class DailyVitals {
  const DailyVitals({
    required this.day,
    this.systolic,
    this.diastolic,
    this.kicks = 0,
    this.ironTaken = false,
  });

  final DateTime day;
  final int? systolic;
  final int? diastolic;
  final int kicks;
  final bool ironTaken;

  factory DailyVitals.fromSnapshot(
    DocumentSnapshot<Map<String, dynamic>> snapshot,
    DateTime day,
  ) {
    final data = snapshot.data() ?? const <String, dynamic>{};
    return DailyVitals(
      day: day,
      systolic: (data['systolic'] as num?)?.toInt(),
      diastolic: (data['diastolic'] as num?)?.toInt(),
      kicks: (data['kicks'] as num?)?.toInt() ?? 0,
      ironTaken: data['ironTaken'] as bool? ?? false,
    );
  }
}

class Appointment {
  const Appointment({
    required this.id,
    required this.scheduledAt,
    required this.clinic,
    required this.status,
    this.midwifeName,
    this.midwifePhone,
    this.room,
    this.agenda,
  });

  final String id;
  final DateTime scheduledAt;
  final String clinic;
  final String status;
  final String? midwifeName;
  final String? midwifePhone;
  final String? room;
  final String? agenda;

  factory Appointment.fromSnapshot(
    QueryDocumentSnapshot<Map<String, dynamic>> snapshot,
  ) {
    final data = snapshot.data();
    final scheduledAt = data['scheduledAt'];
    if (scheduledAt is! Timestamp) {
      throw StateError(
          'Appointment ${snapshot.id} has no scheduledAt timestamp.');
    }
    return Appointment(
      id: snapshot.id,
      scheduledAt: scheduledAt.toDate(),
      clinic: data['clinic'] as String? ?? '',
      status: data['status'] as String? ?? '',
      midwifeName: data['midwifeName'] as String?,
      midwifePhone: data['midwifePhone'] as String?,
      room: data['room'] as String?,
      agenda: data['agenda'] as String?,
    );
  }
}

class HealthLog {
  const HealthLog({
    required this.id,
    required this.type,
    this.sign,
    this.systolic,
    this.diastolic,
    this.kicks,
    this.taken,
    this.createdAt,
  });

  final String id;
  final String type;
  final String? sign;
  final int? systolic;
  final int? diastolic;
  final int? kicks;
  final bool? taken;
  final DateTime? createdAt;

  factory HealthLog.fromSnapshot(
    QueryDocumentSnapshot<Map<String, dynamic>> snapshot,
  ) {
    final data = snapshot.data();
    final createdAt = data['createdAt'];
    return HealthLog(
      id: snapshot.id,
      type: data['type'] as String? ?? 'health_update',
      sign: data['sign'] as String?,
      systolic: (data['systolic'] as num?)?.toInt(),
      diastolic: (data['diastolic'] as num?)?.toInt(),
      kicks:
          (data['kicks'] as num?)?.toInt() ?? (data['total'] as num?)?.toInt(),
      taken: data['taken'] as bool?,
      createdAt: createdAt is Timestamp ? createdAt.toDate() : null,
    );
  }
}
