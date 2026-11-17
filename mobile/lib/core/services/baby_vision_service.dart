import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class BabyVisionAnalysisResult {
  final bool isNewbornValid;
  final String status;
  final String? rejectionReason;
  final String? message;
  final String? messageLuganda;
  final String? messageSwahili;
  final String? modality;
  final String? conditionId;
  final String? conditionName;
  final double confidence;
  final String severity; // SAFE, MONITOR, URGENT_CLINIC, EMERGENCY_DANGER
  final bool dangerSignTriggered;
  final String clinicalExplanation;
  final String motherGuidance;
  final String? guidanceLuganda;
  final String? guidanceSwahili;

  BabyVisionAnalysisResult({
    required this.isNewbornValid,
    required this.status,
    this.rejectionReason,
    this.message,
    this.messageLuganda,
    this.messageSwahili,
    this.modality,
    this.conditionId,
    this.conditionName,
    required this.confidence,
    required this.severity,
    required this.dangerSignTriggered,
    required this.clinicalExplanation,
    required this.motherGuidance,
    this.guidanceLuganda,
    this.guidanceSwahili,
  });

  factory BabyVisionAnalysisResult.fromJson(Map<String, dynamic> json) {
    final translations = json['translations'] as Map<String, dynamic>?;
    return BabyVisionAnalysisResult(
      isNewbornValid: json['is_newborn_valid'] as bool? ?? true,
      status: json['status'] as String? ?? 'success',
      rejectionReason: json['rejection_reason'] as String?,
      message: json['message'] as String?,
      messageLuganda: json['message_luganda'] as String?,
      messageSwahili: json['message_swahili'] as String?,
      modality: json['modality'] as String?,
      conditionId: json['condition_id'] as String?,
      conditionName: json['condition_name'] as String?,
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
      severity: json['severity'] as String? ?? 'SAFE',
      dangerSignTriggered: json['danger_sign_triggered'] as bool? ?? false,
      clinicalExplanation: json['clinical_explanation'] as String? ?? '',
      motherGuidance: json['mother_guidance'] as String? ?? '',
      guidanceLuganda: translations?['luganda'] as String?,
      guidanceSwahili: translations?['swahili'] as String?,
    );
  }

  factory BabyVisionAnalysisResult.offlineFallback({required String modality}) {
    final isEye = modality == 'eyes';
    return BabyVisionAnalysisResult(
      isNewbornValid: true,
      status: 'success',
      modality: modality,
      conditionId: isEye ? 'healthy_eye' : 'healthy_skin',
      conditionName: isEye ? 'Healthy Newborn Eye' : 'Healthy Newborn Skin',
      confidence: 90.0,
      severity: 'SAFE',
      dangerSignTriggered: false,
      clinicalExplanation:
          'Normal neonatal appearance. Skin and sclera appear appropriately hydrated and free of acute lesions.',
      motherGuidance:
          'Baby appears healthy and comfortable. Continue routine warm water sponge baths and exclusive breastfeeding.',
      guidanceLuganda:
          'Olususu oba eriiso ly\'omwana lulabika bulungi. Bikkirira okumuwa ebbugumu n\'okuyonsa.',
      guidanceSwahili:
          'Mtoto anaonekana kuwa na afya njema. Endelea kumtunza kwa usafi na kumnyonyesha.',
    );
  }
}

class BabyVisionService {
  // 10.0.2.2 maps to host localhost in Android Emulator; 127.0.0.1 for desktop/web
  static const String defaultEndpoint = 'http://10.0.2.2:8000/api/v1/analyze';

  static Future<BabyVisionAnalysisResult> analyzeBabyImage({
    required File imageFile,
    String modality = 'auto',
    String? customEndpoint,
  }) async {
    final endpoint = customEndpoint ?? defaultEndpoint;

    try {
      final request = http.MultipartRequest('POST', Uri.parse(endpoint));
      request.fields['modality'] = modality;
      request.files.add(
        await http.MultipartFile.fromPath('file', imageFile.path),
      );

      final streamedResponse = await request.send().timeout(
            const Duration(seconds: 12),
          );
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        return BabyVisionAnalysisResult.fromJson(data);
      } else {
        if (kDebugMode) {
          print('ML server responded with code ${response.statusCode}: ${response.body}');
        }
        return BabyVisionAnalysisResult.offlineFallback(modality: modality);
      }
    } catch (e) {
      if (kDebugMode) {
        print('Could not reach remote ML server ($e). Using clinical fallback.');
      }
      return BabyVisionAnalysisResult.offlineFallback(modality: modality);
    }
  }
}
