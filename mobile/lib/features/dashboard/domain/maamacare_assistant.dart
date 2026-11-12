import 'dart:convert';

import 'package:flutter/services.dart';

class MaamaCareIntent {
  final List<String> keywords;
  final String response;

  const MaamaCareIntent({
    required this.keywords,
    required this.response,
  });

  factory MaamaCareIntent.fromJson(Map<String, dynamic> json) {
    return MaamaCareIntent(
      keywords: (json['keywords'] as List<dynamic>).cast<String>(),
      response: json['response'] as String,
    );
  }
}

class MaamaCareLanguage {
  final String key;
  final String name;
  final String greeting;
  final String placeholder;
  final String listenText;
  final List<String> quickChips;
  final Map<String, MaamaCareIntent> intents;
  final String defaultResponse;

  const MaamaCareLanguage({
    required this.key,
    required this.name,
    required this.greeting,
    required this.placeholder,
    required this.listenText,
    required this.quickChips,
    required this.intents,
    required this.defaultResponse,
  });

  factory MaamaCareLanguage.fromJson(
    String key,
    Map<String, dynamic> json,
  ) {
    final rawIntents = Map<String, dynamic>.from(json['intents'] as Map);
    return MaamaCareLanguage(
      key: key,
      name: json['name'] as String,
      greeting: json['greeting'] as String,
      placeholder: json['placeholder'] as String,
      listenText: json['listenText'] as String,
      quickChips: (json['quickChips'] as List<dynamic>).cast<String>(),
      intents: rawIntents.map(
        (name, value) => MapEntry(
          name,
          MaamaCareIntent.fromJson(Map<String, dynamic>.from(value as Map)),
        ),
      ),
      defaultResponse: json['default'] as String,
    );
  }

  String responseTo(String question) {
    final normalizedQuestion = question.toLowerCase();
    for (final intent in intents.values) {
      if (intent.keywords.any(
        (keyword) => normalizedQuestion.contains(keyword.toLowerCase()),
      )) {
        return intent.response;
      }
    }
    return defaultResponse;
  }
}

class MaamaCareCatalog {
  final Map<String, MaamaCareLanguage> languages;

  const MaamaCareCatalog(this.languages);

  static Future<MaamaCareCatalog> load() async {
    final source = await rootBundle.loadString(
      'assets/data/maamacare_languages.json',
    );
    final rawCatalog = Map<String, dynamic>.from(jsonDecode(source) as Map);
    return MaamaCareCatalog(
      rawCatalog.map(
        (key, value) => MapEntry(
          key,
          MaamaCareLanguage.fromJson(
            key,
            Map<String, dynamic>.from(value as Map),
          ),
        ),
      ),
    );
  }
}
