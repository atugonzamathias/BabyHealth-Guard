import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../widgets/ambient_background.dart';
import '../widgets/care_access_indicator_bar.dart';
import '../widgets/get_started_button.dart';
import '../widgets/hero_image_card.dart';

/// The Mother's Interface Welcome Screen for BabyHealth Guard.
///
/// Faithfully reproduces the aesthetic, typography, warm organic shadows,
/// and interactive gestures from the design specification.
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AmbientBackground(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              physics: const ClampingScrollPhysics(),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: constraints.maxHeight,
                ),
                child: IntrinsicHeight(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 24.0, vertical: 12.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Top Section: Screen Title & Subtitle
                        const Padding(
                          padding: EdgeInsets.only(top: 8.0, bottom: 12.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Welcome to\nBabyHealth Guard',
                                style: TextStyle(
                                  fontFamily: 'Plus Jakarta Sans',
                                  fontSize: 31,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.8,
                                  height: 1.18,
                                  color: AppColors.stone900,
                                ),
                              ),
                              SizedBox(height: 10),
                              Text(
                                'Simple health monitoring and midwife care for you and your baby.',
                                style: TextStyle(
                                  fontFamily: 'Plus Jakarta Sans',
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w500,
                                  height: 1.45,
                                  color: AppColors.stone600,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Center: Hero Visual with soft shadow & rounded glass border
                        const Expanded(
                          child: Padding(
                            padding: EdgeInsets.symmetric(vertical: 16.0),
                            child: HeroImageCard(),
                          ),
                        ),

                        // Bottom action section
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8.0),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              GetStartedButton(
                                label: 'Login',
                                onPressed: () =>
                                    Navigator.of(context).pushNamed('/login'),
                              ),
                              const SizedBox(height: 14),
                              const CareAccessIndicatorBar(),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
