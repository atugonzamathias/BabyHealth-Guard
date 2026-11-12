import 'package:flutter/material.dart';

class CareAccessIndicatorBar extends StatelessWidget {
  const CareAccessIndicatorBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.cloud_done_outlined,
            size: 15, color: Color(0xFF0E7490)),
        const SizedBox(width: 6),
        Text(
          'Secure care records',
          style: Theme.of(context).textTheme.labelSmall,
        ),
      ],
    );
  }
}
