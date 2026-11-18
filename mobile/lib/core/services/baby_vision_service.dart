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
      motherGuidance: json['mother_guidance'] as String? ??
          json['message'] as String? ??
          '',
      guidanceLuganda: translations?['luganda'] as String? ??
          json['message_luganda'] as String?,
      guidanceSwahili: translations?['swahili'] as String? ??
          json['message_swahili'] as String?,
    );
  }
}

class BabyVisionService {
  static const String defaultEndpoint =
      'https://babyhealth-guard-ml.onrender.com/api/v1/analyze';

  static Future<BabyVisionAnalysisResult> analyzeBabyImage({
    required File imageFile,
    String modality = 'auto',
    String? customEndpoint,
  }) async {
    final endpoint = customEndpoint ?? defaultEndpoint;

    final request = http.MultipartRequest('POST', Uri.parse(endpoint));
    request.fields['modality'] = modality;
    // JPG and JPEG are the same format. Preserve jpg/jpeg filenames so
    // multipart upload detection sends image/jpeg rather than application/octet-stream.
    final originalPath = imageFile.path;
    final originalName = originalPath.split(RegExp(r'[\\/]')).last;
    final lowerName = originalName.toLowerCase();
    final uploadName = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')
        ? originalName
        : originalName.isEmpty
            ? 'baby_photo.jpg'
            : originalName;
    request.files.add(
      await http.MultipartFile.fromPath(
        'file',
        imageFile.path,
        filename: uploadName,
      ),
    );

    try {
      final streamedResponse = await request.send().timeout(
            const Duration(seconds: 90),
          );
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode != 200) {
        var detail = 'Image analysis failed (HTTP ${response.statusCode}).';
        try {
          final body = jsonDecode(response.body);
          if (body is Map<String, dynamic>) {
            detail = (body['detail'] ?? body['error'] ?? detail).toString();
          }
        } on FormatException {
          if (response.body.isNotEmpty) detail = response.body;
        }
        throw Exception(detail);
      }

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      return BabyVisionAnalysisResult.fromJson(data);
    } catch (error) {
      if (kDebugMode) {
        debugPrint('Baby vision analysis request failed: $error');
      }
      rethrow;
    }
  }
}
