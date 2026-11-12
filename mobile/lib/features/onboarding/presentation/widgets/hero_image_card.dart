import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';

/// Hero visual card displaying a warm mother & baby portrait with smooth rounded corners,
/// white glass border, organic soft shadow, and graceful offline fallback.
class HeroImageCard extends StatelessWidget {
  final String? imageAsset;
  final String? imageUrl;

  const HeroImageCard({
    super.key,
    this.imageAsset = 'assets/images/baby_welcome.jpg',
    this.imageUrl =
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRk1GQMu_bW71W1HLqqmPdjA13C31PmXR4giZ3cgQzaaVEDOhJOdxSpMjkF&s=10',
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          maxWidth: 310,
        ),
        child: AspectRatio(
          aspectRatio: 4 / 4.3,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(36),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.8),
                width: 4,
              ),
              boxShadow: const [
                BoxShadow(
                  color: AppColors.cardShadow,
                  blurRadius: 40,
                  spreadRadius: -5,
                  offset: Offset(0, 20),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(32),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // Hero Image with asset or network loading and fallback
                  _buildImage(),

                  // Subtle gradient overlay at bottom edge of portrait for gentle blend
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 64,
                    child: IgnorePointer(
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.bottomCenter,
                            end: Alignment.topCenter,
                            colors: [
                              Colors.black.withValues(alpha: 0.18),
                              Colors.black.withValues(alpha: 0.06),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildImage() {
    if (imageAsset != null && imageAsset!.isNotEmpty) {
      return Image.asset(
        imageAsset!,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          if (imageUrl != null && imageUrl!.isNotEmpty) {
            return _buildNetworkImage(imageUrl!);
          }
          return _buildArtisticFallback();
        },
      );
    }
    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return _buildNetworkImage(imageUrl!);
    }
    return _buildArtisticFallback();
  }

  Widget _buildNetworkImage(String url) {
    return Image.network(
      url,
      fit: BoxFit.cover,
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return _buildPlaceholder(
          child: const CircularProgressIndicator(
            strokeWidth: 2.5,
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
          ),
        );
      },
      errorBuilder: (context, error, stackTrace) {
        return _buildArtisticFallback();
      },
    );
  }

  Widget _buildPlaceholder({required Widget child}) {
    return Container(
      color: const Color(0xFFF1F5F9),
      alignment: Alignment.center,
      child: child,
    );
  }

  /// Elegant fallback when network/auth is unavailable or offline
  Widget _buildArtisticFallback() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFE0F2FE), // Soft Cyan
            Color(0xFFFDFBF7), // Warm Sand
            Color(0xFFFCE7F3), // Tender Rose
          ],
        ),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background ambient shapes
          Positioned(
            top: 40,
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.6),
              ),
            ),
          ),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.primary.withValues(alpha: 0.12),
                  border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.2),
                      width: 2),
                ),
                child: const Icon(
                  Icons.child_care_rounded,
                  size: 50,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Maternal & Newborn Care',
                style: TextStyle(
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.stone800,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Nurturing every step together',
                style: TextStyle(
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: AppColors.stone600,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
