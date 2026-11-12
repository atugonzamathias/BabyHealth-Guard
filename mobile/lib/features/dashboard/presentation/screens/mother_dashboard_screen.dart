import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../data/care_repository.dart';
import '../../domain/mother_profile.dart';
import '../../../health_tracking/presentation/screens/my_health_screen.dart';
import '../../../danger_signs/presentation/screens/danger_signs_screen.dart';
import '../widgets/maamacare_assistant_sheet.dart';

/// Mother Dashboard Screen
/// Faithful Flutter implementation of the BabyHealth Guard Mother Dashboard,
/// My Health, and Danger Signs views.
class MotherDashboardScreen extends StatefulWidget {
  final MotherProfile profile;
  final Future<void> Function() onSignOut;
  final CareRepository careRepository;

  const MotherDashboardScreen({
    super.key,
    required this.profile,
    required this.onSignOut,
    required this.careRepository,
  });

  @override
  State<MotherDashboardScreen> createState() => _MotherDashboardScreenState();
}

class _MotherDashboardScreenState extends State<MotherDashboardScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  int _currentTab = 0; // 0: Home, 1: My Health, 2: Warning Signs, 3: Visits
  late DailyVitals _vitals;
  List<Appointment> _appointments = const [];
  List<HealthLog> _healthLogs = const [];

  int get _kickCount => _vitals.kicks;
  bool get _isIronFolicTaken => _vitals.ironTaken;
  String get _bpSystolic => _vitals.systolic?.toString() ?? '—';
  String get _bpDiastolic => _vitals.diastolic?.toString() ?? '—';
  late final DateTime _today = DateTime.now();
  Appointment? get _nextAppointment {
    for (final appointment in _appointments) {
      if (!appointment.scheduledAt.isBefore(_today)) return appointment;
    }
    return null;
  }

  int get _completedAppointments => _appointments
      .where((appointment) => appointment.status.toLowerCase() == 'completed')
      .length;

  // Design Token Colors matching Tailwind Config
  static const Color colorBackground = Color(0xFFFAF8FF);
  static const Color colorPrimary = Color(0xFF005A71);
  static const Color colorPrimaryContainer = Color(0xFF0E7490);
  static const Color colorSecondary = Color(0xFF00687A);
  static const Color colorOnPrimary = Color(0xFFFFFFFF);
  static const Color colorOnSurface = Color(0xFF131B2E);
  static const Color colorOnSurfaceVariant = Color(0xFF3F484C);
  static const Color colorSurfaceContainerLow = Color(0xFFF2F3FF);
  static const Color colorSurfaceContainerLowest = Color(0xFFFFFFFF);
  Future<void> _recordKick() async {
    try {
      await widget.careRepository.logKick(widget.profile.uid, _today);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Kick recorded.'),
            duration: Duration(seconds: 1),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (_) {
      _showSaveError();
    }
  }

  Future<void> _toggleIronTaken() async {
    try {
      await widget.careRepository.setIronTaken(
        uid: widget.profile.uid,
        day: _today,
        taken: !_isIronFolicTaken,
      );
    } catch (_) {
      _showSaveError();
    }
  }

  void _showSaveError() {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
            'Could not save your health record. Check your connection and try again.'),
      ),
    );
  }

  String _formatDateTime(DateTime dateTime) {
    final date = MaterialLocalizations.of(context).formatFullDate(dateTime);
    final time = MaterialLocalizations.of(context).formatTimeOfDay(
      TimeOfDay.fromDateTime(dateTime),
    );
    return '$date at $time';
  }

  Future<void> _makeCall(String phoneNumber) async {
    final normalizedNumber = phoneNumber.replaceAll(RegExp(r'[\s()-]'), '');
    if (normalizedNumber.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('No phone number is available for this contact.')),
      );
      return;
    }

    final uri = Uri(scheme: 'tel', path: normalizedNumber);
    try {
      final launched =
          await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('This device cannot place that call.')),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This device cannot place that call.')),
      );
    }
  }

  String? get _assignedMidwifePhone {
    final phone =
        (widget.profile.assignedStaffPhone ?? widget.profile.midwifePhone ?? '')
            .trim();
    return phone.isEmpty ? null : phone;
  }

  String get _careTeamName {
    final name =
        widget.profile.assignedStaffName ?? widget.profile.midwifeName ?? '';
    return name.trim().isEmpty ? 'Care team not assigned' : name;
  }

  String? _appointmentContactPhone(Appointment appointment) {
    final assignedPhone = widget.profile.assignedStaffPhone?.trim() ?? '';
    if (assignedPhone.isNotEmpty) return assignedPhone;
    final appointmentPhone = appointment.midwifePhone?.trim() ?? '';
    if (appointmentPhone.isNotEmpty) return appointmentPhone;
    return _assignedMidwifePhone;
  }

  Future<void> _sendSms(String phoneNumber) async {
    final normalizedNumber = phoneNumber.replaceAll(RegExp(r'[\s()-]'), '');
    if (normalizedNumber.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('No phone number is available for this contact.')),
      );
      return;
    }
    final uri = Uri(scheme: 'sms', path: normalizedNumber);
    try {
      final launched =
          await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('This device cannot open messaging.')),
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This device cannot open messaging.')),
      );
    }
  }

  void _showRecordVitalsSheet() {
    final sysController =
        TextEditingController(text: _vitals.systolic?.toString() ?? '');
    final diaController =
        TextEditingController(text: _vitals.diastolic?.toString() ?? '');
    final kickController = TextEditingController(text: '$_kickCount');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            16,
            20,
            MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Row(
                children: [
                  Icon(Icons.favorite_rounded, color: colorPrimary, size: 24),
                  SizedBox(width: 10),
                  Text(
                    "Record Today's Vitals",
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: colorOnSurface,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text(
                'Blood Pressure (Systolic / Diastolic mmHg)',
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: colorOnSurface,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: sysController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: 'Systolic',
                        filled: true,
                        fillColor: colorSurfaceContainerLow,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 12),
                      ),
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 10),
                    child: Text('/',
                        style: TextStyle(
                            fontSize: 20, fontWeight: FontWeight.bold)),
                  ),
                  Expanded(
                    child: TextField(
                      controller: diaController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: 'Diastolic',
                        filled: true,
                        fillColor: colorSurfaceContainerLow,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 12),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text(
                'Baby Kicks Counted Today',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: colorOnSurface,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: kickController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  hintText: '10',
                  filled: true,
                  fillColor: colorSurfaceContainerLow,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () {
                    final navigator = Navigator.of(context);
                    final messenger = ScaffoldMessenger.of(this.context);
                    final systolic = int.tryParse(sysController.text.trim());
                    final diastolic = int.tryParse(diaController.text.trim());
                    final kicks = int.tryParse(kickController.text.trim());
                    if ((sysController.text.trim().isNotEmpty &&
                            (systolic == null || systolic <= 0)) ||
                        (diaController.text.trim().isNotEmpty &&
                            (diastolic == null || diastolic <= 0)) ||
                        kicks == null ||
                        kicks < 0 ||
                        ((systolic == null) != (diastolic == null))) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                              'Enter valid blood pressure and kick values.'),
                        ),
                      );
                      return;
                    }
                    widget.careRepository
                        .saveVitals(
                      uid: widget.profile.uid,
                      day: _today,
                      systolic: systolic,
                      diastolic: diastolic,
                      kicks: kicks,
                    )
                        .then((_) {
                      if (!mounted) return;
                      navigator.pop();
                      messenger.showSnackBar(
                        const SnackBar(
                          content: Text("Today's vitals saved successfully."),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }).catchError((Object _) {
                      _showSaveError();
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colorPrimaryContainer,
                    foregroundColor: colorOnPrimary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(100),
                    ),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Save Vitals',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _handleDangerCardTap(String signTitle, String signDescription) {
    widget.careRepository
        .logDangerSign(
      uid: widget.profile.uid,
      sign: signTitle,
      description: signDescription,
    )
        .catchError((Object _) {
      _showSaveError();
    });
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Row(
          children: [
            const Icon(Icons.warning_amber_rounded,
                color: Colors.red, size: 26),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                signTitle,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: colorOnSurface,
                ),
              ),
            ),
          ],
        ),
        content: Text(
          '$signDescription\n\nWould you like to call your midwife now for free support?',
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 13.5,
            color: colorOnSurfaceVariant,
            height: 1.4,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(context);
              _makeCall(_assignedMidwifePhone ?? '');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: colorPrimaryContainer,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(100),
              ),
            ),
            icon: const Icon(Icons.call, size: 16),
            label: Text(
              widget.profile.assignedStaffRole == null
                  ? 'Call Midwife'
                  : 'Call Care Team',
            ),
          ),
        ],
      ),
    );
  }

  void _showVisitDetails() {
    final appointment = _nextAppointment;
    if (appointment == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No upcoming clinic visit is scheduled.')),
      );
      return;
    }
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Clinic Visit Details',
          style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('• Date: ${_formatDateTime(appointment.scheduledAt)}'),
            const SizedBox(height: 6),
            Text('• Clinic: ${appointment.clinic}'),
            const SizedBox(height: 6),
            Text(
                '• Assigned Midwife: ${appointment.midwifeName ?? 'Not assigned'}'),
            const SizedBox(height: 6),
            Text(
                '• Agenda: ${appointment.agenda ?? 'No visit notes available.'}'),
            const SizedBox(height: 10),
            Text(
              'Visit status: ${appointment.status}',
              style:
                  const TextStyle(fontSize: 12, color: colorPrimaryContainer),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DailyVitals>(
      stream: widget.careRepository.watchDailyVitals(
        widget.profile.uid,
        _today,
      ),
      builder: (context, vitalsSnapshot) {
        if (vitalsSnapshot.hasError) {
          return _dashboardError(
            'Could not load today\'s health records. Check your connection and try again.',
          );
        }
        if (!vitalsSnapshot.hasData) return _loadingScreen();
        _vitals = vitalsSnapshot.data!;

        return StreamBuilder<List<Appointment>>(
          stream: widget.careRepository.watchAppointments(widget.profile.uid),
          builder: (context, appointmentSnapshot) {
            if (appointmentSnapshot.hasError) {
              return _dashboardError(
                'Could not load clinic visits. Check your connection and try again.',
              );
            }
            if (!appointmentSnapshot.hasData) return _loadingScreen();
            _appointments = appointmentSnapshot.data!;
            return StreamBuilder<List<HealthLog>>(
              stream: widget.careRepository.watchHealthLogs(widget.profile.uid),
              builder: (context, healthLogSnapshot) {
                if (healthLogSnapshot.hasError) {
                  return _dashboardError(
                    'Could not load your health history. Check your connection and try again.',
                  );
                }
                if (!healthLogSnapshot.hasData) return _loadingScreen();
                _healthLogs = healthLogSnapshot.data!;
                return _buildDashboard();
              },
            );
          },
        );
      },
    );
  }

  Widget _loadingScreen() {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }

  Widget _dashboardError(String message) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(message, textAlign: TextAlign.center),
        ),
      ),
    );
  }

  Widget _buildDashboard() {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: colorBackground,
      drawer: _buildNavigationDrawer(),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openMaamaCareAssistant,
        backgroundColor: colorPrimaryContainer,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.auto_awesome),
        label: const Text('MaamaCare'),
      ),
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // Header dynamically changes based on active tab
            if (_currentTab == 1)
              _buildMyHealthHeader()
            else if (_currentTab == 2)
              _buildDangerSignsHeader()
            else if (_currentTab == 3)
              _buildVisitsHeader()
            else
              _buildHomeHeader(),

            // Content changes based on active tab
            Expanded(
              child: _buildCurrentTabContent(),
            ),
          ],
        ),
      ),
    );
  }

  void _openMaamaCareAssistant() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => MaamaCareAssistantSheet(
        onCallEmergency: () => _makeCall('112'),
      ),
    );
  }

  Widget _buildNavigationDrawer() {
    final drawerWidth = MediaQuery.sizeOf(context).width * 0.4;
    return Drawer(
      width: drawerWidth,
      child: SafeArea(
        child: Column(
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'Menu',
                maxLines: 1,
                style: TextStyle(
                  color: colorPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            _buildDrawerItem(0, 'Home', Icons.home_rounded),
            _buildDrawerItem(1, 'My Health', Icons.health_and_safety_rounded),
            _buildDrawerItem(2, 'Warning Signs', Icons.warning_amber_rounded),
            _buildDrawerItem(3, 'Visits', Icons.calendar_month_rounded),
            const Spacer(),
            const Divider(height: 1),
            InkWell(
              onTap: () {
                Navigator.of(context).pop();
                widget.onSignOut();
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 6,
                  vertical: 12,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.logout_rounded, size: 14),
                    const SizedBox(width: 3),
                    Flexible(
                      child: _drawerLabel('Logout'),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerItem(int index, String label, IconData icon) {
    final isSelected = _currentTab == index;
    return ListTile(
      dense: true,
      minVerticalPadding: 8,
      minLeadingWidth: 24,
      horizontalTitleGap: 8,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
      leading: Icon(
        icon,
        size: 20,
        color: isSelected ? colorPrimaryContainer : colorOnSurfaceVariant,
      ),
      title: _drawerLabel(
        label,
        color: isSelected ? colorPrimaryContainer : colorOnSurface,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
      ),
      selected: isSelected,
      onTap: () {
        Navigator.of(context).pop();
        setState(() => _currentTab = index);
      },
    );
  }

  Widget _drawerLabel(
    String label, {
    Color color = colorOnSurface,
    FontWeight fontWeight = FontWeight.normal,
  }) {
    return FittedBox(
      fit: BoxFit.scaleDown,
      child: Text(
        label,
        maxLines: 1,
        softWrap: false,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: fontWeight,
        ),
      ),
    );
  }

  Widget _buildMenuButton() {
    return IconButton(
      tooltip: 'Open navigation menu',
      onPressed: () => _scaffoldKey.currentState?.openDrawer(),
      icon: const Icon(Icons.menu_rounded, color: colorOnSurface),
    );
  }

  Widget _buildCurrentTabContent() {
    switch (_currentTab) {
      case 1:
        return MyHealthScreen(
          profile: widget.profile,
          vitals: _vitals,
          healthLogs: _healthLogs,
          appointment: _nextAppointment,
          onRecordVitals: _showRecordVitalsSheet,
          onLogKick: () => _recordKick(),
          onToggleIron: () => _toggleIronTaken(),
          onViewAppointment: _showVisitDetails,
        );
      case 2:
        return DangerSignsScreen(
          onReport: _handleDangerCardTap,
          onCallEmergency: () => _makeCall('112'),
        );
      case 3:
        return _buildVisitsContent();
      default:
        return _buildHomeContent();
    }
  }

  // --------------------------------------------------------------------------
  // TAB 2: DANGER SIGNS (WARNINGS) SECTION
  // --------------------------------------------------------------------------
  Widget _buildDangerSignsHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: BoxDecoration(
        color: colorBackground.withValues(alpha: 0.95),
        border: Border(
          bottom: BorderSide(color: Colors.grey.shade200, width: 0.8),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildMenuButton(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFEAEDFF),
              borderRadius: BorderRadius.circular(100),
              border: Border.all(
                  color: const Color(0xFFBEC8CD).withValues(alpha: 0.4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: colorPrimary,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                const Text(
                  '24/7 PRIORITY',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                    color: colorPrimary,
                  ),
                ),
              ],
            ),
          ),
          InkWell(
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Priority emergency line is active.'),
                  duration: Duration(seconds: 2),
                ),
              );
            },
            borderRadius: BorderRadius.circular(100),
            child: Container(
              width: 40,
              height: 40,
              decoration: const BoxDecoration(
                color: Color(0xFFEAEDFF),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.notifications_none_rounded,
                  size: 20, color: colorOnSurface),
            ),
          ),
        ],
      ),
    );
  }

  /// Header for the Visits tab (Tab 3)
  Widget _buildVisitsHeader() {
    final namePart = widget.profile.firstName;
    final stageLabel = widget.profile.maternalStatus == 'baby'
        ? 'Newborn'
        : widget.profile.pregnancyStage;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: BoxDecoration(
        color: colorBackground.withValues(alpha: 0.95),
        border: Border(
          bottom: BorderSide(color: Colors.grey.shade200, width: 0.8),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildMenuButton(),
          // Left: pulsing dot + subtext + title
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0.4, end: 1.0),
                      duration: const Duration(milliseconds: 900),
                      curve: Curves.easeInOut,
                      builder: (context, value, child) => Opacity(
                        opacity: value,
                        child: child,
                      ),
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: colorPrimary,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        '$namePart • $stageLabel',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.44,
                          color: Color(0xFF00687A),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                const Text(
                  'My Visits',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: colorOnSurface,
                  ),
                ),
              ],
            ),
          ),
          // Right: Emergency button + person icon
          Row(
            children: [
              InkWell(
                onTap: () {},
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: colorPrimaryContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.call_rounded, size: 16, color: Colors.white),
                      SizedBox(width: 4),
                      Text(
                        'Emergency',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                width: 32,
                height: 32,
                decoration: const BoxDecoration(
                  color: colorPrimary,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.person_rounded,
                    size: 18, color: Colors.white),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // TAB 1: MY HEALTH SECTION
  // --------------------------------------------------------------------------
  Widget _buildMyHealthHeader() {
    final firstName = widget.profile.firstName;
    final stageText = widget.profile.maternalStatus == 'baby'
        ? 'Newborn'
        : widget.profile.pregnancyStage;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: colorBackground.withValues(alpha: 0.95),
        border: Border(
          bottom: BorderSide(color: Colors.grey.shade200, width: 0.8),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildMenuButton(),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'My Health',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: colorOnSurface,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Color(0xFF10B981),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        '$firstName • $stageText',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: colorSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          InkWell(
            onTap: () => _makeCall('112'),
            borderRadius: BorderRadius.circular(12),
            child: Container(
              height: 40,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: colorPrimaryContainer,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: colorPrimaryContainer.withValues(alpha: 0.25),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.call, size: 16, color: colorOnPrimary),
                  SizedBox(width: 6),
                  Text(
                    'Emergency',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 12.5,
                      fontWeight: FontWeight.bold,
                      color: colorOnPrimary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // TAB 3: VISITS SECTION
  // --------------------------------------------------------------------------
  Widget _buildVisitsContent() {
    final appointment = _nextAppointment;
    if (appointment == null) {
      return SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 100),
        child: Center(
          child: Column(
            children: [
              const Icon(Icons.event_available_outlined,
                  size: 52, color: colorPrimary),
              const SizedBox(height: 12),
              Text(
                'No upcoming clinic visits',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 4),
              const Text(
                'Your clinic appointments will appear here when they are added to your care profile.',
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }
    final visitNumber = _appointments.indexOf(appointment) + 1;
    final progress = _appointments.isEmpty
        ? 0.0
        : _completedAppointments / _appointments.length;
    final careContacts = [
      if (_careTeamName != 'Care team not assigned')
        _careTeamName
      else if (appointment.midwifeName != null)
        appointment.midwifeName!,
      if (appointment.room != null) 'Room ${appointment.room}',
    ];
    final careContact = careContacts.isEmpty
        ? 'Care team not assigned'
        : careContacts.join(' • ');
    final appointmentContactPhone = _appointmentContactPhone(appointment);

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Title Section
          const Padding(
            padding: EdgeInsets.fromLTRB(4, 4, 4, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Clinic Visits & Reminders',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.24,
                    color: colorOnSurface,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Regular checks protect both you and your baby\'s safe arrival.',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    fontWeight: FontWeight.w400,
                    color: colorOnSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Next ANC Visit Card
          Container(
            decoration: BoxDecoration(
              color: colorSurfaceContainerLowest,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: const Color(0xFFBEC8CD).withValues(alpha: 0.3),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 12,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Colored top bar
                Container(height: 6, color: colorPrimary),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Badges row
                      Row(
                        children: [
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: colorPrimary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(100),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: const BoxDecoration(
                                      color: colorPrimary,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Flexible(
                                    child: Text(
                                      'Next ANC Visit ($visitNumber of ${_appointments.length})',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontFamily: 'Inter',
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 0.44,
                                        color: colorPrimary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE2E7FF),
                              borderRadius: BorderRadius.circular(100),
                            ),
                            child: Text(
                              appointment.status,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.44,
                                color: Color(0xFF00687A),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Date & Time
                      Text(
                        MaterialLocalizations.of(context)
                            .formatFullDate(appointment.scheduledAt),
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 24,
                          fontWeight: FontWeight.w600,
                          letterSpacing: -0.24,
                          color: colorOnSurface,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        MaterialLocalizations.of(context).formatTimeOfDay(
                          TimeOfDay.fromDateTime(appointment.scheduledAt),
                        ),
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                          color: colorPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Clinic info row
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF2F3FF),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: colorPrimary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(
                                Icons.local_hospital_rounded,
                                color: colorPrimary,
                                size: 22,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    appointment.clinic,
                                    style: const TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: colorOnSurface,
                                    ),
                                  ),
                                  Text(
                                    careContact,
                                    style: const TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 12,
                                      color: colorOnSurfaceVariant,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Call button
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: ElevatedButton.icon(
                          onPressed: appointmentContactPhone == null
                              ? null
                              : () => _makeCall(appointmentContactPhone),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: colorPrimaryContainer,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            elevation: 1,
                          ),
                          icon: const Icon(Icons.call_rounded, size: 20),
                          label: Text(
                            widget.profile.assignedStaffRole == null
                                ? 'Call Clinic / Midwife'
                                : 'Call Assigned Care Team',
                            style: const TextStyle(
                              fontFamily: 'Inter',
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Remember Note Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: colorSurfaceContainerLowest,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: const Color(0xFFBEC8CD).withValues(alpha: 0.3),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 6,
                  offset: const Offset(0, 1),
                ),
              ],
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.check_circle_rounded,
                  color: colorPrimary,
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: RichText(
                    text: const TextSpan(
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 14,
                        color: colorOnSurface,
                      ),
                      children: [
                        TextSpan(
                          text: 'Remember: ',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: colorPrimary,
                          ),
                        ),
                        TextSpan(
                          text:
                              'Bring your Mother-Child Yellow Book and clean drinking water.',
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Past Visit Progress Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: colorSurfaceContainerLowest,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: const Color(0xFFBEC8CD).withValues(alpha: 0.3),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 6,
                  offset: const Offset(0, 1),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Row(
                        children: [
                          Icon(
                            Icons.history_edu_rounded,
                            color: colorPrimary,
                            size: 20,
                          ),
                          SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Past Visit Progress',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: colorOnSurface,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: colorPrimary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(100),
                      ),
                      child: Text(
                        '$_completedAppointments of ${_appointments.length} Done',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.44,
                          color: colorPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Progress bar
                ClipRRect(
                  borderRadius: BorderRadius.circular(100),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 8,
                    backgroundColor: const Color(0xFFE2E7FF),
                    valueColor:
                        const AlwaysStoppedAnimation<Color>(colorPrimary),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '$_completedAppointments of ${_appointments.length} visits completed • Next check-up is Visit $visitNumber',
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    color: colorOnSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // TAB 0: HOME SECTION
  // --------------------------------------------------------------------------
  Widget _buildHomeHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: BoxDecoration(
        color: colorBackground.withValues(alpha: 0.95),
        border: Border(
          bottom: BorderSide(color: Colors.grey.shade200, width: 0.8),
        ),
      ),
      child: Row(
        children: [
          _buildMenuButton(),
          const SizedBox(width: 4),
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white,
              border: Border.all(color: Colors.grey.shade200, width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: const ClipOval(
              child: Icon(Icons.person, color: colorPrimary),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        widget.profile.fullName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: colorOnSurface,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE6F4F1),
                        borderRadius: BorderRadius.circular(100),
                        border: Border.all(
                          color: const Color(0xFFCCE9E3),
                          width: 0.8,
                        ),
                      ),
                      child: Text(
                        widget.profile.village,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF0F766E),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  widget.profile.email,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: colorOnSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHomeContent() {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Hero Visual Card
          _buildHeroCard(),

          const SizedBox(height: 16),

          // Midwife Card
          _buildMidwifeCard(),

          const SizedBox(height: 16),

          // 3 Health Metric Cards
          _buildQuickHealthChecks(),

          const SizedBox(height: 16),

          // Next ANC Visit Card
          _buildAncVisitCard(),

          const SizedBox(height: 16),

          // Danger signs banner & Emergency call
          _buildEmergencyActions(),
        ],
      ),
    );
  }

  // Hero Card with Image and Trimester Countdown
  Widget _buildHeroCard() {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: AspectRatio(
          aspectRatio: 4 / 3,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.asset(
                'assets/images/baby_welcome.jpg',
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFF0E7490), Color(0xFF005A71)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: const Center(
                    child: Icon(Icons.favorite_rounded,
                        size: 64, color: Colors.white70),
                  ),
                ),
              ),

              // Gradient Overlay at Bottom
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.transparent,
                        Colors.black.withValues(alpha: 0.25),
                        Colors.black.withValues(alpha: 0.75),
                      ],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      stops: const [0.5, 0.75, 1.0],
                    ),
                  ),
                ),
              ),

              // Top Badges
              Positioned(
                top: 12,
                left: 12,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.95),
                    borderRadius: BorderRadius.circular(100),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.6),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: const BoxDecoration(
                          color: Color(0xFF10B981),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        widget.profile.maternalStatus == 'baby'
                            ? 'Newborn Baby Stage'
                            : (widget.profile.pregnancyStage.isEmpty
                                ? 'Pregnancy stage not set'
                                : widget.profile.pregnancyStage),
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: colorOnSurface,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              Positioned(
                top: 12,
                right: 12,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.92),
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: Text(
                    MaterialLocalizations.of(context).formatMonthYear(_today),
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0F766E),
                    ),
                  ),
                ),
              ),

              // Bottom Title & Due window
              Positioned(
                left: 16,
                right: 16,
                bottom: 14,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${widget.profile.fullName} & ${widget.profile.maternalStatus == 'baby' ? 'Newborn' : 'Baby'}',
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        shadows: [
                          Shadow(
                            color: Colors.black45,
                            blurRadius: 4,
                            offset: Offset(0, 1),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      widget.profile.maternalStatus == 'baby'
                          ? 'Postnatal checkup recommended at 6 weeks'
                          : 'Pregnancy stage: ${widget.profile.pregnancyStage}',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 12,
                        color: Colors.white.withValues(alpha: 0.92),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Assigned Midwife Card
  Widget _buildMidwifeCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFCCE9E3), width: 0.8),
        gradient: LinearGradient(
          colors: [
            const Color(0xFFF0FDF4).withValues(alpha: 0.4),
            Colors.white,
          ],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Midwife icon
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFFE6F4F1),
              border: Border.all(color: const Color(0xFFCCE9E3)),
            ),
            child: const Icon(
              Icons.support_agent_rounded,
              color: Color(0xFF0F766E),
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.profile.assignedStaffRole == null
                      ? 'YOUR MIDWIFE'
                      : 'YOUR CARE TEAM',
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 10.5,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                    color: Color(0xFF0F766E),
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  _careTeamName,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: colorOnSurface,
                  ),
                ),
                Text(
                  widget.profile.assignedStaffFacilityName ??
                      widget.profile.facilityName ??
                      'Health facility not assigned',
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    color: colorOnSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          // Call & SMS buttons
          Row(
            children: [
              InkWell(
                onTap: _assignedMidwifePhone == null
                    ? null
                    : () => _makeCall(_assignedMidwifePhone!),
                borderRadius: BorderRadius.circular(100),
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color(0xFF0F766E),
                  ),
                  child: const Icon(Icons.call, color: Colors.white, size: 18),
                ),
              ),
              const SizedBox(width: 8),
              InkWell(
                onTap: _assignedMidwifePhone == null
                    ? null
                    : () => _sendSms(_assignedMidwifePhone!),
                borderRadius: BorderRadius.circular(100),
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.grey.shade100,
                  ),
                  child: const Icon(Icons.chat_bubble_outline_rounded,
                      color: colorOnSurface, size: 18),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 3 Quick Health Checks
  Widget _buildQuickHealthChecks() {
    return Row(
      children: [
        // Kicks Card (Interactive)
        Expanded(
          child: InkWell(
            onTap: () {
              _recordKick();
            },
            borderRadius: BorderRadius.circular(18),
            child: Container(
              height: 136,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.grey.shade100),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.02),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.amber.shade50,
                    ),
                    child: Icon(Icons.child_care_rounded,
                        color: Colors.amber.shade600, size: 18),
                  ),
                  Column(
                    children: [
                      Text(
                        '$_kickCount kicks',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: colorOnSurface,
                        ),
                      ),
                      const Text(
                        'Count Today',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 10.5,
                          color: colorOnSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  const Text(
                    '+ Log Kick',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0F766E),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        const SizedBox(width: 10),

        // Blood Pressure Card
        Expanded(
          child: Container(
            height: 136,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.grey.shade100),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 10,
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color(0xFFE6F4F1),
                  ),
                  child: const Icon(Icons.favorite_rounded,
                      color: Color(0xFF0F766E), size: 18),
                ),
                Column(
                  children: [
                    Text(
                      '$_bpSystolic / $_bpDiastolic',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: colorOnSurface,
                      ),
                    ),
                    Text(
                      _vitals.systolic == null
                          ? 'No reading'
                          : 'Latest reading',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 10.5,
                        color: colorOnSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                Text(
                  _vitals.systolic == null ? 'Not recorded' : 'Recorded today',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF10B981),
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(width: 10),

        // Iron & Folic (Interactive Toggle)
        Expanded(
          child: InkWell(
            onTap: () {
              _toggleIronTaken();
            },
            borderRadius: BorderRadius.circular(18),
            child: Container(
              height: 136,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.grey.shade100),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.02),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.indigo.shade50,
                    ),
                    child: Icon(Icons.medication_rounded,
                        color: Colors.indigo.shade600, size: 18),
                  ),
                  const Column(
                    children: [
                      Text(
                        'Iron & Folic',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 13.5,
                          fontWeight: FontWeight.bold,
                          color: colorOnSurface,
                        ),
                      ),
                      Text(
                        '1 Pill Daily',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 10.5,
                          color: colorOnSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        _isIronFolicTaken
                            ? Icons.check_circle_rounded
                            : Icons.schedule_rounded,
                        size: 13,
                        color: _isIronFolicTaken
                            ? const Color(0xFF10B981)
                            : Colors.amber.shade700,
                      ),
                      const SizedBox(width: 3),
                      Flexible(
                        child: Text(
                          _isIronFolicTaken ? 'Taken' : 'Pending',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 10.5,
                            fontWeight: FontWeight.w600,
                            color: _isIronFolicTaken
                                ? const Color(0xFF10B981)
                                : Colors.amber.shade700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  // Next ANC Visit Card
  Widget _buildAncVisitCard() {
    final appointment = _nextAppointment;
    if (appointment == null) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.grey.shade100),
        ),
        child: const Row(
          children: [
            Icon(Icons.calendar_month_rounded, color: colorPrimary),
            SizedBox(width: 12),
            Expanded(child: Text('No upcoming clinic visit is scheduled.')),
          ],
        ),
      );
    }
    final visitNumber = _appointments.indexOf(appointment) + 1;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFE6F4F1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.calendar_month_rounded,
              color: Color(0xFF0F766E),
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        'ANC VISIT $visitNumber OF ${_appointments.length}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                          color: Color(0xFF0F766E),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        appointment.status,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                          color: colorOnSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  _formatDateTime(appointment.scheduledAt),
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: colorOnSurface,
                  ),
                ),
                Text(
                  appointment.clinic,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 11,
                    color: colorOnSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: _showVisitDetails,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.grey.shade100,
              foregroundColor: colorOnSurface,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(100),
              ),
            ),
            child: const Text(
              'Details',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Emergency & Danger signs CTA in Home Tab
  Widget _buildEmergencyActions() {
    return Column(
      children: [
        // Report Danger signs card (switches to Danger Signs tab)
        InkWell(
          onTap: () => setState(() => _currentTab = 2),
          borderRadius: BorderRadius.circular(18),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: Colors.amber.shade200.withValues(alpha: 0.8),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.02),
                  blurRadius: 8,
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.warning_amber_rounded,
                      color: Colors.amber.shade700, size: 20),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Report Danger Signs',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 13.5,
                          fontWeight: FontWeight.bold,
                          color: colorOnSurface,
                        ),
                      ),
                      Text(
                        'Bleeding, fever, blurred vision or pain',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 11,
                          color: colorOnSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded,
                    color: Colors.grey.shade400, size: 20),
              ],
            ),
          ),
        ),

        const SizedBox(height: 12),

        // 24/7 Emergency Dispatch CTA Button
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton.icon(
            onPressed: () => _makeCall('112'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0F766E),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(100),
              ),
              elevation: 1,
            ),
            icon: const Icon(Icons.call, size: 20),
            label: const Text(
              'Emergency Call (Toll-Free 24/7)',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
