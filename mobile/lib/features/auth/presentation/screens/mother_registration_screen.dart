import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../../../core/utils/validators.dart';
import '../../data/auth_repository.dart';
import '../../../dashboard/data/care_repository.dart';
import '../../../dashboard/domain/mother_profile.dart';

/// Maternal Profile Registration Screen
/// Matches the official Tailwind / Material Design spec for BabyHealth Guard.
class MotherRegistrationScreen extends StatefulWidget {
  const MotherRegistrationScreen({super.key});

  @override
  State<MotherRegistrationScreen> createState() =>
      _MotherRegistrationScreenState();
}

class _MotherRegistrationScreenState extends State<MotherRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _ageController = TextEditingController();
  final _villageController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _authRepository = AuthRepository();
  final _careRepository = CareRepository();
  late final _midwivesStream = _careRepository.watchMidwives();

  // State variables matching interactive form controls
  String _selectedLanguage = 'Luganda';
  String _maternalStatus = 'expecting'; // 'expecting' or 'baby'
  String _pregnancyStage = '4 - 6 Mo'; // '1 - 3 Mo', '4 - 6 Mo', '7 - 9 Mo'
  String _parity = 'First Baby (1st)'; // 'First Baby (1st)', '2nd or More'
  String _selectedMidwifeUid = '';
  String? _selectedMidwifeName;
  String? _selectedMidwifePhone;
  final Set<String> _selectedConditions = {'None'};
  bool _isLoading = false;

  // Exact theme color palette from spec
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
  void dispose() {
    _nameController.dispose();
    _ageController.dispose();
    _villageController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _toggleCondition(String condition) {
    setState(() {
      if (condition == 'None') {
        _selectedConditions.clear();
        _selectedConditions.add('None');
      } else {
        _selectedConditions.remove('None');
        if (_selectedConditions.contains(condition)) {
          _selectedConditions.remove(condition);
          if (_selectedConditions.isEmpty) {
            _selectedConditions.add('None');
          }
        } else {
          _selectedConditions.add(condition);
        }
      }
    });
  }

  Future<void> _saveProfile() async {
    final name = _nameController.text.trim();
    final age = int.tryParse(_ageController.text.trim());
    final village = _villageController.text.trim();
    final phoneDigits = _phoneController.text.replaceAll(RegExp(r'\s'), '');
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final error = AppValidators.requiredText(name, 'Full name') ??
        (age == null || age < 10 || age > 120 ? 'Enter a valid age' : null) ??
        AppValidators.requiredText(village, 'Village') ??
        (RegExp(r'^\d{9}$').hasMatch(phoneDigits)
            ? null
            : 'Enter a valid 9-digit Ugandan phone number') ??
        AppValidators.email(email) ??
        AppValidators.password(password);
    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error)),
      );
      return;
    }

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
        age: age!,
        village: village,
        phone: '+256 $phoneDigits',
        language: _selectedLanguage,
        maternalStatus: _maternalStatus,
        pregnancyStage: _pregnancyStage,
        parity: _parity,
        conditions: _selectedConditions.toList(growable: false),
        midwifeName: _selectedMidwifeName,
        midwifePhone: _selectedMidwifePhone,
      );
      await _careRepository.saveProfile(profile: profile);
      if (mounted) Navigator.of(context).popUntil((route) => route.isFirst);
    } on FirebaseAuthException catch (error) {
      if (mounted) {
        setState(() => _errorMessage = _authError(error.code));
      }
    } catch (error) {
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
        return 'Choose a stronger password with at least 6 characters.';
      case 'invalid-email':
        return 'Enter a valid email address.';
      case 'network-request-failed':
        return 'Could not connect. Check your internet connection and try again.';
      default:
        return 'We could not create your account. Please try again.';
    }
  }

  String? _errorMessage;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: colorSurface,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(64),
        child: Container(
          decoration: BoxDecoration(
            color: colorSurface.withValues(alpha: 0.92),
            boxShadow: const [
              BoxShadow(
                color: Color(0x0A000000),
                blurRadius: 8,
                offset: Offset(0, 1),
              ),
            ],
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      InkWell(
                        onTap: () => Navigator.of(context).pop(),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          width: 44,
                          height: 44,
                          alignment: Alignment.center,
                          child: const Icon(
                            Icons.arrow_back,
                            size: 20,
                            color: colorOnSurface,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'BABYHEALTH GUARD',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.8,
                              color: colorPrimary,
                            ),
                          ),
                          Text(
                            'Maternal Profile Details',
                            style: TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: colorOnSurface,
                              height: 1.2,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Container(
                    width: 32,
                    height: 32,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: colorPrimary,
                    ),
                    alignment: Alignment.center,
                    child: const Icon(
                      Icons.person,
                      size: 18,
                      color: colorOnPrimary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      body: SafeArea(
        top: false,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 780),
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Page Header Title
                    const SizedBox(height: 6),
                    const Text(
                      'Create Profile',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 24,
                        fontWeight: FontWeight.w600,
                        letterSpacing: -0.2,
                        color: colorOnSurface,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Free for all mothers',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: colorOnSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 16),

                    const SizedBox(height: 16),

                    // Card 2: Personal Details Card
                    _buildCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildSectionHeader('PERSONAL DETAILS'),
                          const SizedBox(height: 14),

                          // Full Name
                          _buildInputLabel('Full Name'),
                          const SizedBox(height: 6),
                          _buildTextInput(
                            controller: _nameController,
                            hint: 'e.g. Amina Brenda',
                            icon: Icons.person,
                          ),
                          const SizedBox(height: 14),

                          // Mother's Age & Village Grid
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _buildInputLabel("Mother's Age"),
                                    const SizedBox(height: 6),
                                    _buildTextInput(
                                      controller: _ageController,
                                      hint: '24 yrs',
                                      icon: Icons.cake,
                                      keyboardType: TextInputType.number,
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
                                      controller: _villageController,
                                      hint: 'Village name',
                                      icon: Icons.location_on,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),

                          // Mobile Phone Number with +256 badge
                          _buildInputLabel('Mobile Phone Number'),
                          const SizedBox(height: 6),
                          Container(
                            height: 48,
                            decoration: BoxDecoration(
                              color: colorSurfaceLow,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: const [
                                BoxShadow(
                                  color: Color(0x08000000),
                                  blurRadius: 3,
                                  offset: Offset(0, 1),
                                ),
                              ],
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            child: Row(
                              children: [
                                const Icon(Icons.call,
                                    size: 18, color: colorPrimary),
                                const SizedBox(width: 6),
                                const Text(
                                  '+256',
                                  style: TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: colorOnSurface,
                                  ),
                                ),
                                Container(
                                  height: 20,
                                  width: 1,
                                  color: colorOutline.withValues(alpha: 0.25),
                                  margin: const EdgeInsets.symmetric(
                                      horizontal: 10),
                                ),
                                Expanded(
                                  child: TextField(
                                    controller: _phoneController,
                                    keyboardType: TextInputType.phone,
                                    style: const TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 15,
                                      color: colorOnSurface,
                                    ),
                                    decoration: InputDecoration(
                                      hintText: '772 000 000',
                                      hintStyle: TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 14,
                                        color:
                                            colorOutline.withValues(alpha: 0.6),
                                      ),
                                      border: InputBorder.none,
                                      isDense: true,
                                      contentPadding: EdgeInsets.zero,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),

                          _buildInputLabel('Email'),
                          const SizedBox(height: 6),
                          _buildTextInput(
                            controller: _emailController,
                            hint: 'you@example.com',
                            icon: Icons.email_outlined,
                            keyboardType: TextInputType.emailAddress,
                          ),
                          const SizedBox(height: 14),

                          _buildInputLabel('Password'),
                          const SizedBox(height: 6),
                          _buildTextInput(
                            controller: _passwordController,
                            hint: 'At least 6 characters',
                            icon: Icons.lock_outline,
                            obscureText: true,
                          ),
                          const SizedBox(height: 14),

                          // Preferred Language for SMS Alerts
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
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Card 3: Pregnancy & Health Card
                    _buildCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildSectionHeader('PREGNANCY & HEALTH'),
                          const SizedBox(height: 14),

                          // Current Maternal Status Toggle
                          _buildInputLabel('Current Maternal Status'),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: _buildStatusToggle(
                                  title: 'Expecting',
                                  icon: Icons.pregnant_woman,
                                  isSelected: _maternalStatus == 'expecting',
                                  onTap: () => setState(
                                      () => _maternalStatus = 'expecting'),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _buildStatusToggle(
                                  title: 'Newborn Baby',
                                  icon: Icons.child_care,
                                  isSelected: _maternalStatus == 'baby',
                                  onTap: () =>
                                      setState(() => _maternalStatus = 'baby'),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          _buildInputLabel('Assigned Midwife'),
                          const SizedBox(height: 6),
                          StreamBuilder<List<MidwifeDirectoryEntry>>(
                            stream: _midwivesStream,
                            builder: (context, snapshot) {
                              final midwives = snapshot.data ?? const [];
                              final selectedUid = midwives.any(
                                (midwife) => midwife.uid == _selectedMidwifeUid,
                              )
                                  ? _selectedMidwifeUid
                                  : '';
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 12),
                                    decoration: BoxDecoration(
                                      color: colorSurfaceLow,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: DropdownButtonHideUnderline(
                                      child: DropdownButton<String>(
                                        isExpanded: true,
                                        value: selectedUid,
                                        hint: Text(
                                          snapshot.hasError
                                              ? 'Midwife list unavailable'
                                              : snapshot.connectionState ==
                                                      ConnectionState.waiting
                                                  ? 'Loading midwives…'
                                                  : 'No midwife selected',
                                        ),
                                        items: [
                                          const DropdownMenuItem(
                                            value: '',
                                            child: Text('No midwife selected'),
                                          ),
                                          ...midwives.map(
                                            (midwife) => DropdownMenuItem(
                                              value: midwife.uid,
                                              child: Text(
                                                midwife.facilityName.isEmpty
                                                    ? midwife.fullName
                                                    : '${midwife.fullName} · ${midwife.facilityName}',
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          ),
                                        ],
                                        onChanged: (uid) {
                                          MidwifeDirectoryEntry? selected;
                                          for (final midwife in midwives) {
                                            if (midwife.uid == uid) {
                                              selected = midwife;
                                              break;
                                            }
                                          }
                                          setState(() {
                                            _selectedMidwifeUid = uid ?? '';
                                            _selectedMidwifeName =
                                                selected?.fullName;
                                            _selectedMidwifePhone = selected !=
                                                        null &&
                                                    selected.phone.isNotEmpty
                                                ? selected.phone
                                                : null;
                                          });
                                        },
                                      ),
                                    ),
                                  ),
                                  if (selectedUid.isNotEmpty &&
                                      _selectedMidwifePhone != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 6),
                                      child: Text(
                                        'Phone: $_selectedMidwifePhone',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: colorOnSurfaceVariant,
                                        ),
                                      ),
                                    ),
                                  if (snapshot.hasError)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 6),
                                      child: Text(
                                        'Could not load the midwife list. You can continue without assigning one.',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.orange.shade800,
                                        ),
                                      ),
                                    ),
                                ],
                              );
                            },
                          ),
                          const SizedBox(height: 14),

                          // Stage / Pregnancy Month (only visible when Expecting)
                          if (_maternalStatus == 'expecting') ...[
                            _buildInputLabel('Stage / Pregnancy Month'),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                _buildPillButton(
                                  text: '1 - 3 Mo',
                                  isSelected: _pregnancyStage == '1 - 3 Mo',
                                  onTap: () => setState(
                                      () => _pregnancyStage = '1 - 3 Mo'),
                                ),
                                const SizedBox(width: 8),
                                _buildPillButton(
                                  text: '4 - 6 Mo',
                                  isSelected: _pregnancyStage == '4 - 6 Mo',
                                  onTap: () => setState(
                                      () => _pregnancyStage = '4 - 6 Mo'),
                                ),
                                const SizedBox(width: 8),
                                _buildPillButton(
                                  text: '7 - 9 Mo',
                                  isSelected: _pregnancyStage == '7 - 9 Mo',
                                  onTap: () => setState(
                                      () => _pregnancyStage = '7 - 9 Mo'),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                          ],

                          // Number of Births (Parity)
                          _buildInputLabel('Number of Births (Parity)'),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              _buildPillButton(
                                text: 'First Baby (1st)',
                                isSelected: _parity == 'First Baby (1st)',
                                onTap: () => setState(
                                    () => _parity = 'First Baby (1st)'),
                              ),
                              const SizedBox(width: 10),
                              _buildPillButton(
                                text: '2nd or More',
                                isSelected: _parity == '2nd or More',
                                onTap: () =>
                                    setState(() => _parity = '2nd or More'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),

                          // Any Known Health Conditions?
                          _buildInputLabel('Any Known Health Conditions?'),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _buildConditionChip('None', Icons.check),
                              _buildConditionChip(
                                  'High BP', Icons.monitor_heart_outlined),
                              _buildConditionChip(
                                  'Anemia', Icons.bloodtype_outlined),
                              _buildConditionChip(
                                  'Other', Icons.medication_outlined),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    if (_errorMessage != null) ...[
                      Text(
                        _errorMessage!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.red),
                      ),
                      const SizedBox(height: 12),
                    ],

                    // Bottom Action: Save & Continue
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _saveProfile,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: colorPrimaryContainer,
                          foregroundColor: colorOnPrimary,
                          elevation: 2,
                          shadowColor:
                              colorPrimaryContainer.withValues(alpha: 0.35),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(28),
                          ),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2.5,
                                ),
                              )
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    'Register',
                                    style: TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  SizedBox(width: 8),
                                  Icon(Icons.arrow_forward, size: 20),
                                ],
                              ),
                      ),
                    ),

                    const SizedBox(height: 12),

                    TextButton(
                      onPressed: () =>
                          Navigator.of(context).pushNamed('/login'),
                      child: const Text('Already have an account? Sign in'),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // --- Helper Widgets ---

  Widget _buildCard({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorSurfaceLowest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: colorOutline.withValues(alpha: 0.18),
          width: 1,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x06000000),
            blurRadius: 4,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _buildSectionHeader(String title) {
    return Container(
      padding: const EdgeInsets.only(bottom: 6),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: colorOutline.withValues(alpha: 0.18),
            width: 1,
          ),
        ),
      ),
      child: Text(
        title,
        style: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.8,
          color: colorPrimary,
        ),
      ),
    );
  }

  Widget _buildInputLabel(String label) {
    return Text(
      label,
      style: const TextStyle(
        fontFamily: 'Inter',
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: colorOnSurface,
      ),
    );
  }

  Widget _buildTextInput({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    bool obscureText = false,
  }) {
    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: colorSurfaceLow,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 3,
            offset: Offset(0, 1),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14),
      alignment: Alignment.center,
      child: Row(
        children: [
          Icon(icon, size: 20, color: colorPrimary),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: controller,
              keyboardType: keyboardType,
              obscureText: obscureText,
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 15,
                color: colorOnSurface,
              ),
              decoration: InputDecoration(
                hintText: hint,
                hintStyle: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 14,
                  color: colorOutline.withValues(alpha: 0.6),
                ),
                border: InputBorder.none,
                isDense: true,
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
        ],
      ),
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
              width: 1,
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x08000000),
                blurRadius: 3,
                offset: Offset(0, 1),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.sms_outlined,
                size: 16,
                color: isSelected ? colorPrimary : colorOnSurfaceVariant,
              ),
              const SizedBox(width: 4),
              Text(
                language,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  color: isSelected ? colorPrimary : colorOnSurfaceVariant,
                ),
              ),
            ],
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
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: isSelected ? colorSurfaceHigh : colorSurfaceLow,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? colorPrimary.withValues(alpha: 0.3)
                : Colors.transparent,
            width: 1.2,
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x08000000),
              blurRadius: 3,
              offset: Offset(0, 1),
            ),
          ],
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
            Flexible(
              child: Text(
                title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                  color: isSelected ? colorPrimary : colorOnSurfaceVariant,
                ),
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
              width: 1,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            text,
            style: TextStyle(
              fontFamily: 'Inter',
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
            width: 1,
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
                fontFamily: 'Inter',
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
