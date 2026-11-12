import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';

/// Interactive "Get Started" Pill Button with animated slide shimmer trailing chevrons,
/// responsive scale feedback on press, and signature teal circular arrow badge.
class GetStartedButton extends StatefulWidget {
  final VoidCallback onPressed;
  final String label;

  const GetStartedButton({
    super.key,
    required this.onPressed,
    this.label = 'Get Started',
  });

  @override
  State<GetStartedButton> createState() => _GetStartedButtonState();
}

class _GetStartedButtonState extends State<GetStartedButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _slideAnimation;
  late Animation<double> _shimmerOpacity;

  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..repeat(reverse: true);

    _slideAnimation = Tween<double>(begin: 0.0, end: 5.0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );

    _shimmerOpacity = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) {
        setState(() => _isPressed = false);
        widget.onPressed();
      },
      onTapCancel: () => setState(() => _isPressed = false),
      child: AnimatedScale(
        scale: _isPressed ? 0.97 : 1.0,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
        child: Container(
          width: double.infinity,
          height: 62,
          padding: const EdgeInsets.only(left: 8, right: 20, top: 8, bottom: 8),
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: AppColors.primary,
              width: 1.2,
            ),
            boxShadow: const [
              BoxShadow(
                color: AppColors.buttonShadow,
                blurRadius: 24,
                spreadRadius: -2,
                offset: Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Golden / Teal circular indicator with arrow icon
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.2),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.arrow_forward_rounded,
                  color: AppColors.primary,
                  size: 22,
                ),
              ),

              // Center Label Text
              Text(
                widget.label,
                style: const TextStyle(
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.3,
                  color: Colors.white,
                ),
              ),

              // Trailing Chevron Triple Arrows with animated shimmer slide effect (>>>)
              AnimatedBuilder(
                animation: _animController,
                builder: (context, child) {
                  return Transform.translate(
                    offset: Offset(_slideAnimation.value, 0),
                    child: Opacity(
                      opacity: _shimmerOpacity.value,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.chevron_right_rounded,
                            size: 20,
                            color: Colors.white,
                          ),
                          Transform.translate(
                            offset: const Offset(-8, 0),
                            child: Icon(
                              Icons.chevron_right_rounded,
                              size: 20,
                              color: Colors.white.withValues(alpha: 0.8),
                            ),
                          ),
                          Transform.translate(
                            offset: const Offset(-16, 0),
                            child: Icon(
                              Icons.chevron_right_rounded,
                              size: 20,
                              color: Colors.white.withValues(alpha: 0.45),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
