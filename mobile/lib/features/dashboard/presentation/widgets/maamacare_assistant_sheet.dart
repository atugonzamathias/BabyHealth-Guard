import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../../domain/maamacare_assistant.dart';

class MaamaCareAssistantSheet extends StatefulWidget {
  final VoidCallback onCallEmergency;

  const MaamaCareAssistantSheet({
    super.key,
    required this.onCallEmergency,
  });

  @override
  State<MaamaCareAssistantSheet> createState() =>
      _MaamaCareAssistantSheetState();
}

class _MaamaCareAssistantSheetState extends State<MaamaCareAssistantSheet> {
  static const Color _primary = Color(0xFF0E7490);

  final _questionController = TextEditingController();
  final _scrollController = ScrollController();
  final _textToSpeech = FlutterTts();
  final _speechToText = SpeechToText();
  final _catalogFuture = MaamaCareCatalog.load();
  String _languageKey = 'luganda';
  List<_ChatMessage> _messages = const [];
  bool _isListening = false;
  String _speechNotice = '';

  @override
  void dispose() {
    _questionController.dispose();
    _scrollController.dispose();
    unawaited(_textToSpeech.stop());
    unawaited(_speechToText.cancel());
    super.dispose();
  }

  void _changeLanguage(MaamaCareLanguage language) {
    setState(() {
      _languageKey = language.key;
      _messages = [_ChatMessage(isUser: false, text: language.greeting)];
    });
  }

  void _sendMessage(String question, MaamaCareLanguage language) {
    final text = question.trim();
    if (text.isEmpty) return;

    setState(() {
      final messages = _messages.isEmpty
          ? [_ChatMessage(isUser: false, text: language.greeting)]
          : _messages;
      _messages = [
        ...messages,
        _ChatMessage(isUser: true, text: text),
        _ChatMessage(isUser: false, text: language.responseTo(text)),
      ];
    });
    _questionController.clear();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _speak(String text, String languageKey) async {
    try {
      await _textToSpeech.setLanguage(
        languageKey == 'swahili' ? 'sw-KE' : 'en-UG',
      );
      await _textToSpeech.setSpeechRate(0.45);
      await _textToSpeech.speak(text.replaceAll(RegExp(r'[⚠️👶🥗🏥🤱🚨]'), ''));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Audio playback is not available on this device.'),
        ),
      );
    }
  }

  Future<void> _toggleVoiceInput() async {
    if (_speechToText.isListening) {
      await _speechToText.stop();
      if (mounted) setState(() => _isListening = false);
      return;
    }

    setState(() => _speechNotice = '');
    try {
      final available = await _speechToText.initialize(
        onStatus: (status) {
          if (mounted) setState(() => _isListening = status == 'listening');
        },
        onError: (_) {
          if (mounted) {
            setState(() {
              _isListening = false;
              _speechNotice =
                  'Could not recognize speech. Check microphone access or type instead.';
            });
          }
        },
      );
      if (!mounted) return;
      if (!available) {
        setState(() {
          _speechNotice =
              'Voice input is not available. You can type your question instead.';
        });
        return;
      }

      await _speechToText.listen(
        listenOptions: SpeechListenOptions(
          localeId: 'en_UG',
          listenFor: const Duration(seconds: 25),
          pauseFor: const Duration(seconds: 3),
          partialResults: true,
        ),
        onResult: (result) {
          if (!mounted) return;
          setState(() {
            _questionController.value = TextEditingValue(
              text: result.recognizedWords,
              selection: TextSelection.collapsed(
                offset: result.recognizedWords.length,
              ),
            );
          });
        },
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _isListening = false;
        _speechNotice =
            'Could not start voice input. Check microphone permission or type your question.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<MaamaCareCatalog>(
      future: _catalogFuture,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return SizedBox(
            height: MediaQuery.sizeOf(context).height * 0.8,
            child: const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'MaamaCare could not load its language guide. Please try again later.',
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          );
        }
        if (!snapshot.hasData) {
          return SizedBox(
            height: MediaQuery.sizeOf(context).height * 0.8,
            child: const Center(child: CircularProgressIndicator()),
          );
        }

        final catalog = snapshot.data!;
        final language =
            catalog.languages[_languageKey] ?? catalog.languages.values.first;
        final messages = _messages.isEmpty
            ? [_ChatMessage(isUser: false, text: language.greeting)]
            : _messages;

        return SafeArea(
          child: Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.viewInsetsOf(context).bottom,
            ),
            child: SizedBox(
              height: MediaQuery.sizeOf(context).height * 0.88,
              child: Column(
                children: [
                  Container(
                    color: _primary,
                    padding: const EdgeInsets.fromLTRB(18, 12, 12, 12),
                    child: Row(
                      children: [
                        const Text('🤱', style: TextStyle(fontSize: 24)),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'MaamaCare Assistant',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Scripted maternal health information',
                                style: TextStyle(
                                  color: Color(0xFFD8F4F7),
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          tooltip: 'Close MaamaCare',
                          onPressed: () => Navigator.of(context).pop(),
                          icon: const Icon(Icons.close, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: DropdownButtonFormField<String>(
                      isExpanded: true,
                      initialValue: language.key,
                      decoration: const InputDecoration(
                        labelText: 'Language',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      items: catalog.languages.values
                          .map(
                            (option) => DropdownMenuItem(
                              value: option.key,
                              child: Text(
                                option.name,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: (key) {
                        if (key != null) {
                          _changeLanguage(catalog.languages[key]!);
                        }
                      },
                    ),
                  ),
                  Expanded(
                    child: ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                      itemCount: messages.length,
                      itemBuilder: (context, index) {
                        final message = messages[index];
                        return Align(
                          alignment: message.isUser
                              ? Alignment.centerRight
                              : Alignment.centerLeft,
                          child: Container(
                            constraints: BoxConstraints(
                              maxWidth: MediaQuery.sizeOf(context).width * 0.78,
                            ),
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: message.isUser ? _primary : Colors.white,
                              border: message.isUser
                                  ? null
                                  : Border.all(color: const Color(0xFFE2E8F0)),
                              borderRadius: BorderRadius.circular(18).copyWith(
                                topRight: message.isUser
                                    ? const Radius.circular(4)
                                    : null,
                                topLeft: message.isUser
                                    ? null
                                    : const Radius.circular(4),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (!message.isUser) ...[
                                  Text(
                                    language.name,
                                    style: const TextStyle(
                                      color: _primary,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                ],
                                Text(
                                  message.text,
                                  style: TextStyle(
                                    color: message.isUser
                                        ? Colors.white
                                        : const Color(0xFF1E293B),
                                    height: 1.4,
                                    fontSize: 13,
                                  ),
                                ),
                                if (!message.isUser)
                                  Align(
                                    alignment: Alignment.centerLeft,
                                    child: TextButton.icon(
                                      onPressed: () => _speak(
                                        message.text,
                                        language.key,
                                      ),
                                      icon: const Icon(
                                        Icons.volume_up_outlined,
                                        size: 16,
                                      ),
                                      label: Text(language.listenText),
                                      style: TextButton.styleFrom(
                                        foregroundColor: _primary,
                                        padding: const EdgeInsets.only(top: 6),
                                        visualDensity: VisualDensity.compact,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 6),
                    color: const Color(0xFFFFFBEB),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'General information only—not a diagnosis. If you may be in danger, seek care now or call 112.',
                          style: TextStyle(
                            color: Color(0xFF78350F),
                            fontSize: 11,
                            height: 1.35,
                          ),
                        ),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: TextButton.icon(
                            onPressed: widget.onCallEmergency,
                            icon: const Icon(Icons.call, size: 15),
                            label: const Text('Call emergency line 112'),
                            style: TextButton.styleFrom(
                              foregroundColor: Colors.red.shade800,
                              visualDensity: VisualDensity.compact,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_speechNotice.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                      child: Text(
                        _speechNotice,
                        style: TextStyle(
                          color: Colors.red.shade800,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 4, 16, 0),
                    child: Text(
                      'Voice input is English-only and may use your device’s speech service.',
                      style: TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 10,
                      ),
                    ),
                  ),
                  SizedBox(
                    height: 48,
                    child: ListView(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      scrollDirection: Axis.horizontal,
                      children: language.quickChips
                          .map(
                            (chip) => Padding(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 4),
                              child: ActionChip(
                                label: Text(
                                  chip,
                                  style: const TextStyle(fontSize: 11),
                                ),
                                onPressed: () => _sendMessage(chip, language),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _questionController,
                            textInputAction: TextInputAction.send,
                            onSubmitted: (text) => _sendMessage(text, language),
                            decoration: InputDecoration(
                              hintText: language.placeholder,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 12,
                              ),
                            ),
                          ),
                        ),
                        IconButton(
                          tooltip: _isListening
                              ? 'Stop voice input'
                              : 'Speak a question in English',
                          onPressed: _toggleVoiceInput,
                          color: _isListening ? Colors.red.shade700 : _primary,
                          icon: Icon(
                            _isListening ? Icons.mic : Icons.mic_none,
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton.filled(
                          tooltip: 'Send question',
                          onPressed: () => _sendMessage(
                            _questionController.text,
                            language,
                          ),
                          icon: const Icon(Icons.send_rounded),
                          style: IconButton.styleFrom(
                            backgroundColor: _primary,
                            foregroundColor: Colors.white,
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
      },
    );
  }
}

class _ChatMessage {
  final bool isUser;
  final String text;

  const _ChatMessage({required this.isUser, required this.text});
}
