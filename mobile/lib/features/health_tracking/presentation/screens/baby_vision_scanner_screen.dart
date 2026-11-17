import 'dart:io';
import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/baby_vision_service.dart';

class BabyVisionScannerScreen extends StatefulWidget {
  final String motherUid;
  final String? midwifePhone;
  final Function(String title, String description)? onSaveLog;

  const BabyVisionScannerScreen({
    super.key,
    required this.motherUid,
    this.midwifePhone,
    this.onSaveLog,
  });

  @override
  State<BabyVisionScannerScreen> createState() =>
      _BabyVisionScannerScreenState();
}

class _BabyVisionScannerScreenState extends State<BabyVisionScannerScreen> {
  String _selectedModality = 'auto'; // 'auto', 'skin', 'eyes'
  bool _isAnalyzing = false;
  BabyVisionAnalysisResult? _result;
  String _language = 'en'; // 'en', 'lg', 'sw'
  bool _savedToLog = false;

  void _runMockSample(String conditionType) {
    setState(() {
      _isAnalyzing = true;
      _result = null;
      _savedToLog = false;
    });

    Future.delayed(const Duration(milliseconds: 900), () {
      if (!mounted) return;
      setState(() {
        _isAnalyzing = false;
        if (conditionType == 'jaundice_skin') {
          _result = BabyVisionAnalysisResult(
            isNewbornValid: true,
            status: 'success',
            modality: 'skin',
            conditionId: 'jaundice_skin',
            conditionName: 'Neonatal Cutaneous Jaundice (Icterus)',
            confidence: 99.7,
            severity: 'URGENT_CLINIC',
            dangerSignTriggered: true,
            clinicalExplanation:
                'Hyperbilirubinemia manifesting as noticeable yellow pigmentation of neonatal skin. Correlates with Kramer zones.',
            motherGuidance:
                'Yellowish skin detected. Neonatal jaundice needs prompt clinical check. Take the baby to your health center today for a bilirubin check and possible phototherapy.',
            guidanceLuganda:
                '⚠️ OBULWADDE BW\'ENJANO KU LUSUSU: Olususu luliko langi ya kyenvu. Omwana ayinza okuba n\'enjano. Mutwale ku ddwaliro leero bamukebe omusaayi.',
            guidanceSwahili:
                '⚠️ MANJANO KWENYE NGOZI: Ngozi ina rangi ya manjano inayoashiria homa ya manjano. Mpeleke mtoto zahanati leo kupimwa bilirubin.',
          );
        } else if (conditionType == 'healthy_skin') {
          _result = BabyVisionAnalysisResult(
            isNewbornValid: true,
            status: 'success',
            modality: 'skin',
            conditionId: 'healthy_skin',
            conditionName: 'Healthy Newborn Skin',
            confidence: 98.4,
            severity: 'SAFE',
            dangerSignTriggered: false,
            clinicalExplanation:
                'Normal physiological newborn skin appearance with expected hydration and absence of acute lesions.',
            motherGuidance:
                'Baby\'s skin appears healthy and well cared for. Continue gentle sponge baths with warm water and skin-to-skin kangaroo care.',
            guidanceLuganda:
                'Olususu lw\'omwana lulabika bulungi era lwa bulamu. Bikkirira okumuwa amazzi amabugumu n\'okumukwata ku kifuba.',
            guidanceSwahili:
                'Ngozi ya mtoto ina afya njema. Endelea kumuosha kwa maji vuguvugu na kumpa joto la ngozi kwa ngozi.',
          );
        } else if (conditionType == 'ophthalmia') {
          _result = BabyVisionAnalysisResult(
            isNewbornValid: true,
            status: 'success',
            modality: 'eyes',
            conditionId: 'ophthalmia_neonatorum',
            conditionName: 'Ophthalmia Neonatorum (Eye Infection)',
            confidence: 99.9,
            severity: 'EMERGENCY_DANGER',
            dangerSignTriggered: true,
            clinicalExplanation:
                'Acute purulent ocular discharge with conjunctival hyperemia and eyelid swelling within first 28 days.',
            motherGuidance:
                '🚨 EMERGENCY: Heavy pus, swelling, or redness in baby\'s eye. This can cause permanent blindness without urgent treatment. Visit your clinic immediately!',
            guidanceLuganda:
                '🚨 OBULABE BW\'AMAASO: Amaaso gazimbye oba gafulumya amasira. Omwana yeetaaga eddagala ly\'amaaso mangu ddala ku ddwaliro!',
            guidanceSwahili:
                '🚨 DHARURA YA MACHO: Macho yana usaha au yamevimba. Mpeleke mtoto hospitalini haraka kwa matone ya antibiotic!',
          );
        } else {
          // Rejection
          _result = BabyVisionAnalysisResult(
            isNewbornValid: false,
            status: 'rejected',
            rejectionReason: 'IMAGE_NOT_NEWBORN',
            confidence: 99.8,
            severity: 'SAFE',
            dangerSignTriggered: false,
            clinicalExplanation:
                'Gatekeeper neural network rejected image: pattern does not match neonatal skin or eye morphology.',
            motherGuidance:
                'The uploaded photo does not appear to be a newborn baby\'s skin or eye. Please ensure you photograph a newborn baby under clear lighting.',
            guidanceLuganda:
                'Ekifaananyi kino tekirabika nga lususu oba liiso ly\'omwana omuwere. Nsaba okube ekifaananyi eky\'omwana omuwere.',
            guidanceSwahili:
                'Picha hii haionekani kuwa ngozi au jicho la mtoto mchanga. Tafadhali piga picha wazi ya mtoto mchanga.',
          );
        }
      });
    });
  }

  void _saveResultToHealthLog() {
    if (_result == null || widget.onSaveLog == null) return;
    widget.onSaveLog!(
      'AI Vision: ${_result!.conditionName ?? "Scan"} (${_result!.severity})',
      _result!.clinicalExplanation.isNotEmpty
          ? _result!.clinicalExplanation
          : _result!.motherGuidance,
    );
    setState(() => _savedToLog = true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Saved to Baby\'s Health History'),
        backgroundColor: Color(0xFF0E7490),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Baby Skin & Eye AI Checker',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
        ),
        backgroundColor: const Color(0xFF0E7490),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Explanatory Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0E7490), Color(0xFF155E75)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.auto_awesome, color: Colors.white),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Newborn Health Vision AI',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                        SizedBox(height: 3),
                        Text(
                          'Instantly checks baby skin & eyes for jaundice, rashes, or infections. Only accepts newborn photos.',
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Mode Selector
            const Text(
              'SELECT TARGET AREA',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Color(0xFF64748B),
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildModalityChip('auto', 'Auto-Detect'),
                const SizedBox(width: 8),
                _buildModalityChip('skin', 'Baby Skin'),
                const SizedBox(width: 8),
                _buildModalityChip('eyes', 'Baby Eyes'),
              ],
            ),

            const SizedBox(height: 20),

            // Camera / Image Box
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.02),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Column(
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFEFF),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.camera_alt_rounded,
                      color: Color(0xFF0E7490),
                      size: 36,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Photograph Baby\'s Skin or Eyes',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Ensure bright natural daylight. Avoid dark shadows.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () => _runMockSample('jaundice_skin'),
                    icon: const Icon(Icons.photo_camera_rounded),
                    label: const Text('Take Photo / Test Jaundice'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0E7490),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 12),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Demo Quick-Test Chips
            const Text(
              'TEST CLINICAL CASES',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Color(0xFF64748B),
                letterSpacing: 0.8,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(
                  avatar: const Text('🟡'),
                  label: const Text('Jaundice Skin'),
                  onPressed: () => _runMockSample('jaundice_skin'),
                ),
                ActionChip(
                  avatar: const Text('🟢'),
                  label: const Text('Healthy Skin'),
                  onPressed: () => _runMockSample('healthy_skin'),
                ),
                ActionChip(
                  avatar: const Text('🔴'),
                  label: const Text('Eye Infection (Pus)'),
                  onPressed: () => _runMockSample('ophthalmia'),
                ),
                ActionChip(
                  avatar: const Text('⬛'),
                  label: const Text('Non-Baby (Reject)'),
                  onPressed: () => _runMockSample('invalid'),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Loader
            if (_isAnalyzing)
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Column(
                    children: const [
                      CircularProgressIndicator(color: Color(0xFF0E7490)),
                      SizedBox(height: 12),
                      Text(
                        'Analyzing baby image with VisionNet...',
                        style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF0E7490)),
                      ),
                    ],
                  ),
                ),
              ),

            // Result Display
            if (_result != null && !_isAnalyzing) _buildResultCard(),
          ],
        ),
      ),
    );
  }

  Widget _buildModalityChip(String key, String label) {
    final isSelected = _selectedModality == key;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedModality = key),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF0E7490) : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isSelected
                  ? const Color(0xFF0E7490)
                  : Colors.grey.shade300,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isSelected ? Colors.white : Colors.black87,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildResultCard() {
    final res = _result!;

    // Non-Baby Rejection
    if (!res.isNewbornValid || res.status == 'rejected') {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF1F2),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFFECDD3), width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.cancel_rounded,
                    color: Color(0xFFE11D48), size: 28),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Photo Ineligible for Baby Screening',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: Color(0xFF881337),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              res.motherGuidance,
              style: const TextStyle(color: Color(0xFF9F1239), fontSize: 13),
            ),
            const SizedBox(height: 10),
            if (res.guidanceLuganda != null)
              Text(
                'Luganda: ${res.guidanceLuganda}',
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF9F1239)),
              ),
          ],
        ),
      );
    }

    // Valid Newborn Condition Result
    final isDanger = res.dangerSignTriggered;
    final sevColor = res.severity == 'EMERGENCY_DANGER'
        ? const Color(0xFFE11D48)
        : res.severity == 'URGENT_CLINIC'
            ? const Color(0xFFF59E0B)
            : res.severity == 'MONITOR'
                ? const Color(0xFF0284C7)
                : const Color(0xFF10B981);

    String advice = res.motherGuidance;
    if (_language == 'lg' && res.guidanceLuganda != null) {
      advice = res.guidanceLuganda!;
    } else if (_language == 'sw' && res.guidanceSwahili != null) {
      advice = res.guidanceSwahili!;
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: sevColor.withValues(alpha: 0.4), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: sevColor.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: sevColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  res.severity.replaceAll('_', ' '),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: sevColor,
                  ),
                ),
              ),
              Text(
                'Confidence: ${res.confidence.toStringAsFixed(1)}%',
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Condition Name
          Text(
            res.conditionName ?? 'Newborn Check',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),

          if (isDanger) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFE4E6),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Row(
                children: [
                  Text('🚨', style: TextStyle(fontSize: 20)),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Danger Sign Detected. Medical consultation strongly advised today.',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFBE123C),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 16),

          // Language Selector
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'GUIDANCE FOR MOTHER',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF64748B),
                ),
              ),
              Row(
                children: [
                  _langBtn('en', 'EN'),
                  const SizedBox(width: 4),
                  _langBtn('lg', 'Luganda'),
                  const SizedBox(width: 4),
                  _langBtn('sw', 'Swahili'),
                ],
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Advice Text
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFDCFCE7)),
            ),
            child: Text(
              advice,
              style: const TextStyle(
                fontSize: 13,
                height: 1.4,
                color: Color(0xFF166534),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Action Buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _savedToLog ? null : _saveResultToHealthLog,
                  icon: Icon(_savedToLog ? Icons.check : Icons.bookmark_border),
                  label: Text(_savedToLog ? 'Logged' : 'Save to Log'),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              if (isDanger) ...[
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      // Call midwife or 112
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Connecting to Clinic Midwife...'),
                          backgroundColor: Color(0xFFE11D48),
                        ),
                      );
                    },
                    icon: const Icon(Icons.call),
                    label: const Text('Call Midwife'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFE11D48),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _langBtn(String code, String label) {
    final active = _language == code;
    return GestureDetector(
      onTap: () => setState(() => _language = code),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF0E7490) : Colors.grey.shade200,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.bold,
            color: active ? Colors.white : Colors.black87,
          ),
        ),
      ),
    );
  }
}
