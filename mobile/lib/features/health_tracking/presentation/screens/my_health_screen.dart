import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../dashboard/domain/mother_profile.dart';

class MyHealthScreen extends StatelessWidget {
  const MyHealthScreen({
    required this.profile,
    required this.vitals,
    required this.healthLogs,
    required this.appointment,
    required this.onRecordVitals,
    required this.onLogKick,
    required this.onToggleIron,
    required this.onViewAppointment,
    super.key,
  });

  final MotherProfile profile;
  final DailyVitals vitals;
  final List<HealthLog> healthLogs;
  final Appointment? appointment;
  final VoidCallback onRecordVitals;
  final VoidCallback onLogKick;
  final VoidCallback onToggleIron;
  final VoidCallback onViewAppointment;

  @override
  Widget build(BuildContext context) {
    final date = MaterialLocalizations.of(context).formatShortDate(vitals.day);
    final bloodPressure = vitals.systolic == null || vitals.diastolic == null
        ? '— / —'
        : '${vitals.systolic} / ${vitals.diastolic}';
    final visitDate = appointment == null
        ? 'Not scheduled'
        : MaterialLocalizations.of(context)
            .formatShortDate(appointment!.scheduledAt);

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  "Today's Vitals",
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
              Text(date, style: Theme.of(context).textTheme.bodySmall),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  icon: Icons.favorite_rounded,
                  label: 'Blood Pressure',
                  value: bloodPressure,
                  footer:
                      vitals.systolic == null ? 'No reading' : 'Latest reading',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: InkWell(
                  onTap: onLogKick,
                  borderRadius: BorderRadius.circular(16),
                  child: _MetricCard(
                    icon: Icons.child_care_rounded,
                    label: 'Baby Kicks',
                    value: '${vitals.kicks} kicks',
                    footer: vitals.kicks == 0 ? 'Tap to log a kick' : 'Today',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            'Care & Medication',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: _cardDecoration(),
            child: Column(
              children: [
                InkWell(
                  onTap: onToggleIron,
                  borderRadius: BorderRadius.circular(12),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xFFACEDFF),
                      child: Icon(Icons.medication_outlined,
                          color: Color(0xFF001F26)),
                    ),
                    title: const Text('Iron & Folic Acid'),
                    subtitle: const Text('Daily medication'),
                    trailing: Chip(
                      label: Text(vitals.ironTaken ? 'Taken today' : 'Pending'),
                      avatar: Icon(
                        vitals.ironTaken ? Icons.check : Icons.schedule,
                        size: 16,
                      ),
                    ),
                  ),
                ),
                const Divider(height: 12),
                InkWell(
                  onTap: appointment == null ? null : onViewAppointment,
                  borderRadius: BorderRadius.circular(12),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xFFB9EAFF),
                      child: Icon(Icons.calendar_today_rounded,
                          color: AppColors.primaryDark),
                    ),
                    title: const Text('Next Clinic Visit'),
                    subtitle: Text(
                      appointment?.clinic ??
                          profile.facilityName ??
                          'No visit scheduled',
                    ),
                    trailing: Text(visitDate),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Recent Health Activity',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          _HealthActivityList(logs: healthLogs),
          const SizedBox(height: 20),
          SizedBox(
            height: 52,
            child: FilledButton.icon(
              onPressed: onRecordVitals,
              icon: const Icon(Icons.add_circle_outline_rounded),
              label: const Text("+ Record Today's Vitals"),
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.footer,
  });

  final IconData icon;
  final String label;
  final String value;
  final String footer;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 130),
      padding: const EdgeInsets.all(14),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: AppColors.primary),
              const SizedBox(width: 6),
              Expanded(
                  child: Text(label,
                      style: Theme.of(context).textTheme.bodySmall)),
            ],
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.stone900,
                ),
          ),
          Text(
            footer,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppColors.primaryDark,
                ),
          ),
        ],
      ),
    );
  }
}

class _HealthActivityList extends StatelessWidget {
  const _HealthActivityList({required this.logs});

  final List<HealthLog> logs;

  @override
  Widget build(BuildContext context) {
    if (logs.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Text('No health records have been logged yet.'),
      );
    }

    return Container(
      decoration: _cardDecoration(),
      child: Column(
        children: [
          for (final log in logs)
            ListTile(
              dense: true,
              leading: Icon(
                log.type == 'danger_sign_reported'
                    ? Icons.warning_amber_rounded
                    : log.type == 'kick_logged'
                        ? Icons.child_care_rounded
                        : log.type == 'iron_folic_updated'
                            ? Icons.medication_outlined
                            : Icons.favorite_outline_rounded,
                color: AppColors.primary,
              ),
              title: Text(_title(log)),
              subtitle: Text(
                log.createdAt == null
                    ? 'Just now'
                    : MaterialLocalizations.of(context)
                        .formatShortDate(log.createdAt!),
              ),
            ),
        ],
      ),
    );
  }

  String _title(HealthLog log) {
    switch (log.type) {
      case 'kick_logged':
        return 'Baby kick recorded';
      case 'iron_folic_updated':
        return log.taken == true
            ? 'Iron & folic acid marked taken'
            : 'Iron & folic acid marked pending';
      case 'vitals_recorded':
        if (log.systolic != null && log.diastolic != null) {
          return 'Blood pressure ${log.systolic}/${log.diastolic} recorded';
        }
        return 'Vitals recorded';
      case 'danger_sign_reported':
        return 'Danger sign reported: ${log.sign ?? 'Review needed'}';
      default:
        return 'Health record updated';
    }
  }
}

BoxDecoration _cardDecoration() {
  return BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(16),
    border: Border.all(color: const Color(0xFFBEC8CD).withValues(alpha: 0.3)),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withValues(alpha: 0.02),
        blurRadius: 8,
      ),
    ],
  );
}
