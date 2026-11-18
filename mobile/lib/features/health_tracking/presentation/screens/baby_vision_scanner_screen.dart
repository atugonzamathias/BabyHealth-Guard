import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
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
  final ImagePicker _imagePicker = ImagePicker();
  String _selectedModality = 'auto'; // 'auto', 'skin', 'eyes'
  bool _isAnalyzing = false;
  BabyVisionAnalysisResult? _result;
  File? _selectedImage;
  String? _analysisError;
  String _language = 'en'; // 'en', 'lg', 'sw'
  bool _savedToLog = false;

  Future<void> _pickImage(ImageSource source) async {
    try {
      final pickedImage = await _imagePicker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1600,
        maxHeight: 1600,
      );
      if (pickedImage == null || !mounted) return;
      setState(() {
        _selectedImage = File(pickedImage.path);
        _result = null;
        _analysisError = null;
        _savedToLog = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _analysisError = 'Could not open the image: $error');
    }
  }

  Future<void> _analyzeSelectedImage() async {
    final image = _selectedImage;
    if (image == null || _isAnalyzing) return;
    setState(() {
      _isAnalyzing = true;
      _result = null;
      _analysisError = null;
      _savedToLog = false;
    });

    try {
      final result = await BabyVisionService.analyzeBabyImage(
        imageFile: image,
        modality: _selectedModality,
      );
      if (!mounted) return;
      setState(() => _result = result);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _analysisError = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) setState(() => _isAnalyzing = false);
    }
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
                          'Experimental image screening for newborn skin and eyes, not a diagnosis. Seek clinical care for any concerning symptoms.',
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
                    decoration: const BoxDecoration(
                      color: Color(0xFFECFEFF),
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
                  if (_selectedImage != null) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.file(
                        _selectedImage!,
                        height: 190,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  Wrap(
                    alignment: WrapAlignment.center,
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      OutlinedButton.icon(
                        onPressed: _isAnalyzing
                            ? null
                            : () => _pickImage(ImageSource.camera),
                        icon: const Icon(Icons.camera_alt_rounded),
                        label: const Text('Take photo'),
                      ),
                      OutlinedButton.icon(
                        onPressed: _isAnalyzing
                            ? null
                            : () => _pickImage(ImageSource.gallery),
                        icon: const Icon(Icons.photo_library_outlined),
                        label: const Text('Choose photo'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (_analysisError != null) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF1F2),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFFECDD3)),
                      ),
                      child: Text(
                        _analysisError!,
                        style: const TextStyle(
                          color: Color(0xFF9F1239),
                          fontSize: 13,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                  ],
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _selectedImage == null || _isAnalyzing
                          ? null
                          : _analyzeSelectedImage,
                      icon: _isAnalyzing
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.auto_awesome),
                      label: Text(
                        _isAnalyzing
                            ? 'Analyzing...'
                            : 'Analyze with BabyHealth AI',
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0E7490),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

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
        onTap: () => setState(() {
          _selectedModality = key;
          _result = null;
          _analysisError = null;
          _savedToLog = false;
        }),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF0E7490) : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color:
                  isSelected ? const Color(0xFF0E7490) : Colors.grey.shade300,
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
            const Row(
              children: [
                Icon(Icons.cancel_rounded, color: Color(0xFFE11D48), size: 28),
                SizedBox(width: 10),
                Expanded(
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
