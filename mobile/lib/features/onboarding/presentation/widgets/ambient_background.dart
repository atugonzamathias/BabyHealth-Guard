import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';

/// Renders the soft ambient pastel gradient background with glowing blur orbs.
class AmbientBackground extends StatelessWidget {
  final Widget child;

  const AmbientBackground({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          stops: [0.0, 0.6, 1.0],
          colors: [
            AppColors.bgGradientStart,
            AppColors.bgGradientMid,
            AppColors.bgGradientEnd,
          ],
        ),
      ),
      child: Stack(
        children: [
          // Top-right soft ambient pastel blue glow orb
          Positioned(
            top: -60,
            right: -50,
            child: IgnorePointer(
              child: Container(
                width: 280,
                height: 280,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.ambientBlue,
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 70, sigmaY: 70),
                  child: const SizedBox(),
                ),
              ),
            ),
          ),

          // Mid-left soft ambient pastel lavender glow orb
          Positioned(
            top: MediaQuery.of(context).size.height * 0.45,
            left: -80,
            child: IgnorePointer(
              child: Container(
                width: 260,
                height: 260,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.ambientLavender,
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 65, sigmaY: 65),
                  child: const SizedBox(),
                ),
              ),
            ),
          ),

          // Main child content
          SafeArea(
            child: child,
          ),
        ],
      ),
    );
  }
}
