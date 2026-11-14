import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/utils/validators.dart';
import '../../data/auth_repository.dart';
import '../../../dashboard/data/care_repository.dart';
import '../../../dashboard/domain/mother_profile.dart';

class MotherRegistrationScreen extends StatefulWidget {
  const MotherRegistrationScreen({super.key});

  @override
  State<MotherRegistrationScreen> createState() =>
      _MotherRegistrationScreenState();
}

class _MotherRegistrationScreenState extends State<MotherRegistrationScreen>
    with SingleTickerProviderStateMixin {
  static const int _totalSteps = 3;

  final _nameFieldKey = GlobalKey();
  final _ageFieldKey = GlobalKey();
  final _villageFieldKey = GlobalKey();
  final _phoneFieldKey = GlobalKey();
  final _emailFieldKey = GlobalKey();
  final _passwordFieldKey = GlobalKey();
  final _confirmPasswordFieldKey = GlobalKey();

  final _nameController = TextEditingController();
  final _ageController = TextEditingController();
  final _villageController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();
  final _confirmPasswordFocus = FocusNode();

  final _authRepository = AuthRepository();
  final _careRepository = CareRepository();

  late final AnimationController _shakeController;
  late final Animation<double> _shakeAnimation;

  String _selectedLanguage = 'Luganda';
  String _maternalStatus = 'expecting';
  String _pregnancyStage = '4 - 6 Mo';
  String _parity = 'First Baby (1st)';
  final Set<String> _selectedConditions = {'None'};

  int _currentStep = 0;
  bool _isLoading = false;
  String? _errorMessage;

  String? _nameError;
  String? _ageError;
  String? _villageError;
  String? _phoneError;
  String? _emailError;
  String? _passwordError;
  String? _confirmPasswordError;

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  static const Color colorSurface = Color(0xFFFAF8FF);
  static const Color colorOnSurface = Color(0xFF131B2E);
  static const Color colorOnSurfaceVariant = Color(0xFF3F484C);
  static const Color colorPrimary = Color(0xFF005A71);
  static const Color colorPrimaryContainer = Color(0xFF0E7490);
  static const Color colorOnPrimary = Color(0xFFFFFFFF);
  static const Color colorSurfaceLowest = Color(0xFFFFFFFF);
  static const Color colorSurfaceLow = Color(0xFFF2F3FF);
  static const Color colorSurfaceHigh = Color(0xFFE2E7FF);
  static const Color colorOutline = Color(0xFF6F787D);

  @override
  void initState() {
    super.initState();
    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 360),
    );
    _shakeAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0, end: -10), weight: 1),
      TweenSequenceItem(tween: Tween(begin: -10, end: 10), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 10, end: -8), weight: 2),
      TweenSequenceItem(tween: Tween(begin: -8, end: 6), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 6, end: -2), weight: 1),
      TweenSequenceItem(tween: Tween(begin: -2, end: 0), weight: 1),
    ]).animate(CurvedAnimation(parent: _shakeController, curve: Curves.easeOut));
  }

  @override
  void dispose() {
    _shakeController.dispose();
    _nameController.dispose();
    _ageController.dispose();
    _villageController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    _confirmPasswordFocus.dispose();
    super.dispose();
  }

  void _triggerValidationFeedback() {
    HapticFeedback.mediumImpact();
    _shakeController.forward(from: 0);
  }

  void _toggleCondition(String condition) {
    setState(() {
      if (condition == 'None') {
        _selectedConditions
          ..clear()
          ..add('None');
        return;
      }
      _selectedConditions.remove('None');
      if (_selectedConditions.contains(condition)) {
        _selectedConditions.remove(condition);
        if (_selectedConditions.isEmpty) _selectedConditions.add('None');
      } else {
        _selectedConditions.add(condition);
      }
    });
  }

  bool _validateStep(int step) {
    if (step == 0) {
      final name = _nameController.text.trim();
      final age = int.tryParse(_ageController.text.trim());
      final village = _villageController.text.trim();
      final phoneDigits = _phoneController.text.replaceAll(RegExp(r'\D'), '');

      _nameError = AppValidators.requiredText(name, 'Full name');
      _ageError =
          age == null || age < 10 || age > 120 ? 'Enter a valid age' : null;
      _villageError = AppValidators.requiredText(village, 'Village');
      _phoneError = RegExp(r'^\d{9}$').hasMatch(phoneDigits)
          ? null
          : 'Enter a valid 9-digit Ugandan phone number';

      return _nameError == null &&
          _ageError == null &&
          _villageError == null &&
          _phoneError == null;
    }

    if (step == 2) {
      final email = _emailController.text.trim();
      final password = _passwordController.text;
      final confirmPassword = _confirmPasswordController.text;

      _emailError = AppValidators.email(email);
      _passwordError = AppValidators.password(password);
      _confirmPasswordError =
          AppValidators.confirmPassword(confirmPassword, password);

      return _emailError == null &&
          _passwordError == null &&
          _confirmPasswordError == null;
    }

    return true;
  }

  Future<void> _scrollToFirstErrorForStep(int step) async {
    final keys = <GlobalKey>[];
    if (step == 0) {
      if (_nameError != null) keys.add(_nameFieldKey);
      if (_ageError != null) keys.add(_ageFieldKey);
      if (_villageError != null) keys.add(_villageFieldKey);
      if (_phoneError != null) keys.add(_phoneFieldKey);
    } else if (step == 2) {
      if (_emailError != null) keys.add(_emailFieldKey);
      if (_passwordError != null) keys.add(_passwordFieldKey);
      if (_confirmPasswordError != null) keys.add(_confirmPasswordFieldKey);
    }
    if (keys.isEmpty) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final context = keys.first.currentContext;
      if (context == null) return;
      Scrollable.ensureVisible(
        context,
        duration: const Duration(milliseconds: 260),
        curve: Curves.easeOut,
        alignment: 0.1,
      );
    });
  }

  void _nextStep() {
    var isValid = true;
    setState(() {
      _errorMessage = null;
      isValid = _validateStep(_currentStep);
      if (!isValid) {
        _errorMessage = 'Please correct the highlighted fields.';
        return;
      }
      if (_currentStep < _totalSteps - 1) {
        _currentStep += 1;
      }
    });
    if (!isValid) {
      _triggerValidationFeedback();
      _scrollToFirstErrorForStep(_currentStep);
    }
  }

  void _previousStep() {
    if (_currentStep == 0) return;
    setState(() {
      _errorMessage = null;
      _currentStep -= 1;
    });
  }

  Future<void> _saveProfile() async {
    var isValid = true;
    setState(() {
      _errorMessage = null;
      isValid = _validateStep(2);
      if (!isValid) {
        _errorMessage = 'Please correct the highlighted fields.';
      }
    });
    if (!isValid) {
      _triggerValidationFeedback();
      await _scrollToFirstErrorForStep(2);
      return;
    }

    final name = _nameController.text.trim();
    final age = int.parse(_ageController.text.trim());
    final village = _villageController.text.trim();
    final phoneDigits = _phoneController.text.replaceAll(RegExp(r'\D'), '');
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    User? createdUser;
    try {
      final credential = await _authRepository.createAccount(
        email: email,
        password: password,
      );
      final user = credential.user;
      if (user == null) {
        throw StateError('Firebase did not return a newly created account.');
      }
      createdUser = user;

      final profile = MotherProfile(
        uid: user.uid,
        fullName: name,
        email: email,
        age: age,
        village: village,
        phone: '+256 $phoneDigits',
        language: _selectedLanguage,
        maternalStatus: _maternalStatus,
        pregnancyStage: _maternalStatus == 'expecting' ? _pregnancyStage : '',
        parity: _parity,
        conditions: _selectedConditions.toList(growable: false),
      );

      await _careRepository.saveProfile(profile: profile);
      if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
    } on FirebaseAuthException catch (error) {
      if (mounted) setState(() => _errorMessage = _authError(error.code));
    } catch (_) {
      if (createdUser != null) {
        try {
          await createdUser.delete();
        } on FirebaseAuthException {
          await _authRepository.signOut();
        }
      }
      if (mounted) {
        setState(() {
          _errorMessage =
              'We could not save your profile. Check your connection and try again.';
        });
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _authError(String code) {
    switch (code) {
      case 'email-already-in-use':
        return 'An account already uses this email. Please sign in.';
      case 'weak-password':
        return 'Choose a stronger password.';
      case 'invalid-email':
        return 'Enter a valid email address.';
      case 'network-request-failed':
        return 'Could not connect. Check your internet connection and try again.';
      default:
        return 'We could not create your account. Please try again.';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: colorSurface,
      appBar: AppBar(
        backgroundColor: colorSurface,
        elevation: 0,
        title: const Text('Create Mother Profile'),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 760),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildStepper(),
                  const SizedBox(height: 12),
                  Expanded(
                    child: AnimatedBuilder(
                      animation: _shakeAnimation,
                      builder: (context, child) {
                        return Transform.translate(
                          offset: Offset(_shakeAnimation.value, 0),
                          child: child,
                        );
                      },
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 220),
                        child: _buildStepContent(),
                      ),
                    ),
                  ),
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      _errorMessage!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.red),
                    ),
                  ],
                  const SizedBox(height: 10),
                  _buildBottomActions(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStepper() {
    const labels = ['Personal', 'Health', 'Account'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        LinearProgressIndicator(
          value: (_currentStep + 1) / _totalSteps,
          minHeight: 6,
          borderRadius: BorderRadius.circular(8),
          backgroundColor: colorSurfaceLow,
          valueColor: const AlwaysStoppedAnimation<Color>(colorPrimary),
        ),
        const SizedBox(height: 10),
        Text(
          'Step ${_currentStep + 1} of $_totalSteps',
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: colorOnSurfaceVariant,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: List.generate(labels.length, (index) {
            final selected = index == _currentStep;
            return Expanded(
              child: Container(
                margin:
                    EdgeInsets.only(right: index == labels.length - 1 ? 0 : 8),
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: selected ? colorSurfaceHigh : colorSurfaceLow,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: selected
                        ? colorPrimary.withValues(alpha: 0.35)
                        : Colors.transparent,
                  ),
                ),
                child: Text(
                  '${index + 1}. ${labels[index]}',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: selected ? colorPrimary : colorOnSurfaceVariant,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                    fontSize: 12,
                  ),
                ),
              ),
            );
          }),
        ),
      ],
    );
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0:
        return SingleChildScrollView(
          key: const ValueKey('step-0'),
          child: _buildCard(child: _buildPersonalStep()),
        );
      case 1:
        return SingleChildScrollView(
          key: const ValueKey('step-1'),
          child: _buildCard(child: _buildHealthStep()),
        );
      default:
        return SingleChildScrollView(
          key: const ValueKey('step-2'),
          child: _buildCard(child: _buildAccountStep()),
        );
    }
  }

  Widget _buildPersonalStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader('PERSONAL DETAILS'),
        const SizedBox(height: 14),
        _buildInputLabel('Full Name'),
        const SizedBox(height: 6),
        _buildTextInput(
          fieldKey: _nameFieldKey,
          controller: _nameController,
          hint: 'e.g. Amina Brenda',
          icon: Icons.person,
          errorText: _nameError,
          onChanged: () {
            if (_nameError != null) {
              setState(() => _nameError = null);
            }
          },
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildInputLabel("Mother's Age"),
                  const SizedBox(height: 6),
                  _buildTextInput(
                    fieldKey: _ageFieldKey,
                    controller: _ageController,
                    hint: '24 yrs',
                    icon: Icons.cake,
                    keyboardType: TextInputType.number,
                    errorText: _ageError,
                    onChanged: () {
                      if (_ageError != null) {
                        setState(() => _ageError = null);
                      }
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildInputLabel('Village / Location'),
                  const SizedBox(height: 6),
                  _buildTextInput(
                    fieldKey: _villageFieldKey,
                    controller: _villageController,
                    hint: 'Village name',
                    icon: Icons.location_on,
                    errorText: _villageError,
                    onChanged: () {
                      if (_villageError != null) {
                        setState(() => _villageError = null);
                      }
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        _buildInputLabel('Mobile Phone Number'),
        const SizedBox(height: 6),
        _buildPhoneInput(fieldKey: _phoneFieldKey),
        const SizedBox(height: 14),
        _buildInputLabel('Preferred Language for SMS Alerts'),
        const SizedBox(height: 6),
        Row(
          children: [
            _buildLanguageButton('Luganda'),
            const SizedBox(width: 8),
            _buildLanguageButton('English'),
            const SizedBox(width: 8),
            _buildLanguageButton('Swahili'),
          ],
        ),
      ],
    );
  }

  Widget _buildHealthStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader('PREGNANCY & HEALTH'),
        const SizedBox(height: 14),
        _buildInputLabel('Current Maternal Status'),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _buildStatusToggle(
                title: 'Expecting',
                icon: Icons.pregnant_woman,
                isSelected: _maternalStatus == 'expecting',
                onTap: () => setState(() => _maternalStatus = 'expecting'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _buildStatusToggle(
                title: 'Newborn Baby',
                icon: Icons.child_care,
                isSelected: _maternalStatus == 'baby',
                onTap: () => setState(() => _maternalStatus = 'baby'),
              ),
            ),
          ],
        ),
        if (_maternalStatus == 'expecting') ...[
          const SizedBox(height: 14),
          _buildInputLabel('Stage / Pregnancy Month'),
          const SizedBox(height: 6),
          Row(
            children: [
              _buildPillButton(
                text: '1 - 3 Mo',
                isSelected: _pregnancyStage == '1 - 3 Mo',
                onTap: () => setState(() => _pregnancyStage = '1 - 3 Mo'),
              ),
              const SizedBox(width: 8),
              _buildPillButton(
                text: '4 - 6 Mo',
                isSelected: _pregnancyStage == '4 - 6 Mo',
                onTap: () => setState(() => _pregnancyStage = '4 - 6 Mo'),
              ),
              const SizedBox(width: 8),
              _buildPillButton(
                text: '7 - 9 Mo',
                isSelected: _pregnancyStage == '7 - 9 Mo',
                onTap: () => setState(() => _pregnancyStage = '7 - 9 Mo'),
              ),
            ],
          ),
        ],
        const SizedBox(height: 14),
        _buildInputLabel('Number of Births (Parity)'),
        const SizedBox(height: 6),
        Row(
          children: [
            _buildPillButton(
              text: 'First Baby (1st)',
              isSelected: _parity == 'First Baby (1st)',
              onTap: () => setState(() => _parity = 'First Baby (1st)'),
            ),
            const SizedBox(width: 10),
            _buildPillButton(
              text: '2nd or More',
              isSelected: _parity == '2nd or More',
              onTap: () => setState(() => _parity = '2nd or More'),
            ),
          ],
        ),
        const SizedBox(height: 14),
        _buildInputLabel('Any Known Health Conditions?'),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _buildConditionChip('None', Icons.check),
            _buildConditionChip('High BP', Icons.monitor_heart_outlined),
            _buildConditionChip('Anemia', Icons.bloodtype_outlined),
            _buildConditionChip('Other', Icons.medication_outlined),
          ],
        ),
      ],
    );
  }

  Widget _buildAccountStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionHeader('ACCOUNT SECURITY'),
        const SizedBox(height: 14),
        _buildInputLabel('Email'),
        const SizedBox(height: 6),
        _buildTextInput(
          fieldKey: _emailFieldKey,
          controller: _emailController,
          focusNode: _emailFocus,
          hint: 'you@example.com',
          icon: Icons.email_outlined,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          onSubmitted: () => FocusScope.of(context).requestFocus(_passwordFocus),
          errorText: _emailError,
          onChanged: () {
            if (_emailError != null) {
              setState(() => _emailError = null);
            }
          },
        ),
        const SizedBox(height: 14),
        _buildInputLabel('Password'),
        const SizedBox(height: 6),
        _buildTextInput(
          fieldKey: _passwordFieldKey,
          controller: _passwordController,
          focusNode: _passwordFocus,
          hint: 'Use at least 8 characters',
          icon: Icons.lock_outline,
          obscureText: _obscurePassword,
          textInputAction: TextInputAction.next,
          onSubmitted: () =>
              FocusScope.of(context).requestFocus(_confirmPasswordFocus),
          errorText: _passwordError,
          trailing: IconButton(
            onPressed: () {
              setState(() => _obscurePassword = !_obscurePassword);
            },
            icon: Icon(
              _obscurePassword ? Icons.visibility : Icons.visibility_off,
              color: colorOnSurfaceVariant,
            ),
          ),
          onChanged: () {
            if (_passwordError != null || _confirmPasswordError != null) {
              setState(() {
                _passwordError = null;
                _confirmPasswordError = null;
              });
            }
          },
        ),
        const SizedBox(height: 14),
        _buildInputLabel('Confirm Password'),
        const SizedBox(height: 6),
        _buildTextInput(
          fieldKey: _confirmPasswordFieldKey,
          controller: _confirmPasswordController,
          focusNode: _confirmPasswordFocus,
          hint: 'Re-enter your password',
          icon: Icons.lock_reset,
          obscureText: _obscureConfirmPassword,
          textInputAction: TextInputAction.done,
          onSubmitted: _saveProfile,
          errorText: _confirmPasswordError,
          trailing: IconButton(
            onPressed: () {
              setState(
                () => _obscureConfirmPassword = !_obscureConfirmPassword,
              );
            },
            icon: Icon(
              _obscureConfirmPassword
                  ? Icons.visibility
                  : Icons.visibility_off,
              color: colorOnSurfaceVariant,
            ),
          ),
          onChanged: () {
            if (_confirmPasswordError != null) {
              setState(() => _confirmPasswordError = null);
            }
          },
        ),
      ],
    );
  }

  Widget _buildBottomActions() {
    final isLastStep = _currentStep == _totalSteps - 1;
    return Row(
      children: [
        if (_currentStep > 0)
          Expanded(
            child: OutlinedButton(
              onPressed: _isLoading ? null : _previousStep,
              child: const Text('Back'),
            ),
          ),
        if (_currentStep > 0) const SizedBox(width: 10),
        Expanded(
          child: ElevatedButton(
            onPressed: _isLoading
                ? null
                : isLastStep
                    ? _saveProfile
                    : _nextStep,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              backgroundColor: colorPrimaryContainer,
              foregroundColor: colorOnPrimary,
            ),
            child: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(isLastStep ? 'Register' : 'Next'),
          ),
        ),
      ],
    );
  }

  Widget _buildPhoneInput({Key? fieldKey}) {
    return Column(
      key: fieldKey,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 48,
          decoration: BoxDecoration(
            color: colorSurfaceLow,
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Row(
            children: [
              const Icon(Icons.call, size: 18, color: colorPrimary),
              const SizedBox(width: 6),
              const Text(
                '+256',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: colorOnSurface,
                ),
              ),
              Container(
                height: 20,
                width: 1,
                color: colorOutline.withValues(alpha: 0.25),
                margin: const EdgeInsets.symmetric(horizontal: 10),
              ),
              Expanded(
                child: TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.done,
                  onChanged: (_) {
                    if (_phoneError != null) {
                      setState(() => _phoneError = null);
                    }
                  },
                  decoration: const InputDecoration(
                    hintText: '772 000 000',
                    border: InputBorder.none,
                    isDense: true,
                  ),
                ),
              ),
            ],
          ),
        ),
        if (_phoneError != null)
          Padding(
            padding: const EdgeInsets.only(top: 6, left: 4),
            child: Text(
              _phoneError!,
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.error,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildCard({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorSurfaceLowest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorOutline.withValues(alpha: 0.18)),
      ),
      child: child,
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.8,
        color: colorPrimary,
      ),
    );
  }

  Widget _buildInputLabel(String label) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: colorOnSurface,
      ),
    );
  }

  Widget _buildTextInput({
    Key? fieldKey,
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    bool obscureText = false,
    TextInputAction? textInputAction,
    FocusNode? focusNode,
    VoidCallback? onSubmitted,
    VoidCallback? onChanged,
    String? errorText,
    Widget? trailing,
  }) {
    return Column(
      key: fieldKey,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 48,
          decoration: BoxDecoration(
            color: colorSurfaceLow,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: errorText == null
                  ? Colors.transparent
                  : Theme.of(context).colorScheme.error.withValues(alpha: 0.45),
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Row(
            children: [
              Icon(icon, size: 20, color: colorPrimary),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: controller,
                  focusNode: focusNode,
                  keyboardType: keyboardType,
                  obscureText: obscureText,
                  textInputAction: textInputAction,
                  onChanged: (_) => onChanged?.call(),
                  onSubmitted: (_) => onSubmitted?.call(),
                  decoration: InputDecoration(
                    hintText: hint,
                    border: InputBorder.none,
                    isDense: true,
                    hintStyle: TextStyle(
                      color: colorOutline.withValues(alpha: 0.6),
                    ),
                  ),
                ),
              ),
              if (trailing != null) trailing,
            ],
          ),
        ),
        if (errorText != null)
          Padding(
            padding: const EdgeInsets.only(top: 6, left: 4),
            child: Text(
              errorText,
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.error,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildLanguageButton(String language) {
    final isSelected = _selectedLanguage == language;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedLanguage = language),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 44,
          decoration: BoxDecoration(
            color: isSelected ? colorSurfaceHigh : colorSurfaceLow,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? colorPrimary.withValues(alpha: 0.25)
                  : Colors.transparent,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            language,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
              color: isSelected ? colorPrimary : colorOnSurfaceVariant,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusToggle({
    required String title,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 56,
        decoration: BoxDecoration(
          color: isSelected ? colorSurfaceHigh : colorSurfaceLow,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? colorPrimary.withValues(alpha: 0.3)
                : Colors.transparent,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 20,
              color: isSelected ? colorPrimary : colorOnSurfaceVariant,
            ),
            const SizedBox(width: 8),
            Text(
              title,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected ? colorPrimary : colorOnSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPillButton({
    required String text,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 44,
          decoration: BoxDecoration(
            color: isSelected ? colorSurfaceHigh : colorSurfaceLow,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? colorPrimary.withValues(alpha: 0.25)
                  : Colors.transparent,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            text,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
              color: isSelected ? colorPrimary : colorOnSurfaceVariant,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildConditionChip(String label, IconData icon) {
    final isSelected = _selectedConditions.contains(label);
    return InkWell(
      onTap: () => _toggleCondition(label),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        height: 36,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: isSelected ? colorSurfaceHigh : colorSurfaceLow,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected
                ? colorPrimary.withValues(alpha: 0.25)
                : Colors.transparent,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14,
              color: isSelected ? colorPrimary : colorOnSurfaceVariant,
            ),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected ? colorPrimary : colorOnSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
