import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';

class DangerSignsScreen extends StatelessWidget {
  const DangerSignsScreen({
    required this.onReport,
    required this.onCallEmergency,
    super.key,
  });

  final void Function(String title, String description) onReport;
  final VoidCallback onCallEmergency;

  static const _signs = [
    (
      icon: Icons.water_drop_rounded,
      title: 'Bleeding',
      subtitle: 'Any blood',
      description:
          'Vaginal bleeding during pregnancy requires immediate clinical review.',
    ),
    (
      icon: Icons.visibility_off_rounded,
      title: 'Severe Headache',
      subtitle: 'Blurry vision',
      description:
          'Severe headache with blurry vision needs immediate clinical review.',
    ),
    (
      icon: Icons.child_care_rounded,
      title: 'Baby Not Moving',
      subtitle: 'Fewer kicks',
      description:
          'Noticeably reduced fetal movement should be checked immediately.',
    ),
    (
      icon: Icons.thermostat_rounded,
      title: 'High Fever',
      subtitle: 'Hot or chills',
      description:
          'High fever or severe chills may require urgent clinical care.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Danger Signs',
              style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 4),
          Text('Tap if you feel any of these',
              style: Theme.of(context).textTheme.bodyMedium),
          const SizedBox(height: 20),
          for (var index = 0; index < _signs.length; index += 2) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                    child:
                        _DangerSignCard(sign: _signs[index], onTap: onReport)),
                const SizedBox(width: 14),
                Expanded(
                  child: _DangerSignCard(
                    sign: _signs[index + 1],
                    onTap: onReport,
                  ),
                ),
              ],
            ),
            if (index + 2 < _signs.length) const SizedBox(height: 14),
          ],
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFFF2F3FF),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: const Color(0xFFBEC8CD).withValues(alpha: 0.3),
              ),
            ),
            child: Column(
              children: [
                SizedBox(
                  height: 54,
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: onCallEmergency,
                    icon: const Icon(Icons.call_rounded),
                    label: const Text('Call for urgent help'),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'If you may be in immediate danger, contact local emergency services.',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DangerSignCard extends StatelessWidget {
  const _DangerSignCard({required this.sign, required this.onTap});

  final ({
    IconData icon,
    String title,
    String subtitle,
    String description
  }) sign;
  final void Function(String title, String description) onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => onTap(sign.title, sign.description),
      borderRadius: BorderRadius.circular(24),
      child: Container(
        constraints: const BoxConstraints(minHeight: 190),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 18),
        decoration: BoxDecoration(
          color: const Color(0xFFF2F3FF),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: const Color(0xFFBEC8CD).withValues(alpha: 0.3),
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(sign.icon, size: 32, color: AppColors.primary),
            ),
            const SizedBox(height: 12),
            Text(
              sign.title,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 3),
            Text(
              sign.subtitle,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}
