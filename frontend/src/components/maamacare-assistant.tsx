"use client";

import languageCatalog from "@/data/maamacare_languages.json";
import { useEffect, useRef, useState, type FormEvent } from "react";

type LanguageKey = keyof typeof languageCatalog;
type LanguageData = (typeof languageCatalog)[LanguageKey];

type Message = {
  id: number;
  sender: "mother" | "assistant";
  text: string;
};

type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const LANGUAGE_OPTIONS = Object.entries(languageCatalog) as [
  LanguageKey,
  LanguageData,
][];

function getResponse(text: string, language: LanguageData): string {
  const query = text.toLocaleLowerCase();
  for (const intent of Object.values(language.intents)) {
    if (intent.keywords.some((keyword) => query.includes(keyword.toLocaleLowerCase()))) {
      return intent.response;
    }
  }
  return language.default;
}

function createGreeting(language: LanguageData, id: number): Message {
  return { id, sender: "assistant", text: language.greeting };
}

export function MaamaCareAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [languageKey, setLanguageKey] = useState<LanguageKey>("luganda");
  const [messages, setMessages] = useState<Message[]>(() => [
    createGreeting(languageCatalog.luganda, 0),
  ]);
  const [draft, setDraft] = useState("");
  const [audioNotice, setAudioNotice] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);
  const speechRecognition = useRef<SpeechRecognitionLike | null>(null);
  const nextMessageId = useRef(1);
  const language = languageCatalog[languageKey];

  useEffect(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function changeLanguage(nextLanguage: LanguageKey) {
    setLanguageKey(nextLanguage);
    setMessages([
      createGreeting(languageCatalog[nextLanguage], nextMessageId.current++),
    ]);
    setAudioNotice("");
  }

  function submitMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { id: nextMessageId.current++, sender: "mother", text: trimmed },
      {
        id: nextMessageId.current++,
        sender: "assistant",
        text: getResponse(trimmed, language),
      },
    ]);
    setDraft("");
    setAudioNotice("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitMessage(draft);
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) {
      setAudioNotice("Audio playback is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[⚠️👶🥗🏥🤱🚨]/gu, ""));
    utterance.lang = languageKey === "swahili" ? "sw-KE" : "en-UG";
    utterance.rate = 0.93;
    window.speechSynthesis.speak(utterance);
    setAudioNotice("");
  }

  function startVoiceInput() {
    const speechWindow = window as SpeechRecognitionWindow;
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setAudioNotice("Voice input is not supported in this browser.");
      return;
    }

    speechRecognition.current?.stop();
    const recognition = new Recognition();
    recognition.lang = "en-UG";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      speechRecognition.current = null;
      if (transcript) submitMessage(transcript);
      else setAudioNotice("No speech was recognized. Please try again.");
    };
    recognition.onerror = () => {
      speechRecognition.current = null;
      setAudioNotice("Could not recognize speech. Check microphone access or type instead.");
    };
    speechRecognition.current = recognition;
    setAudioNotice("Listening in English…");
    try {
      recognition.start();
    } catch {
      speechRecognition.current = null;
      setAudioNotice("Could not start voice input. Please type your question.");
    }
  }

  function closeAssistant() {
    setIsOpen(false);
    speechRecognition.current?.stop();
    speechRecognition.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  return (
    <>
      <button
        aria-label="Open MaamaCare assistant"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-cyan-800 px-4 py-3 text-sm font-bold text-white shadow-xl transition hover:bg-cyan-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <span aria-hidden="true">🤱</span>
        MaamaCare
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45">
          <button
            aria-label="Close MaamaCare assistant"
            className="absolute inset-0 cursor-default"
            onClick={closeAssistant}
            tabIndex={-1}
            type="button"
          />
          <section
            aria-label="MaamaCare assistant"
            aria-modal="true"
            className="relative flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
            role="dialog"
          >
            <header className="flex items-center justify-between bg-gradient-to-r from-cyan-950 to-cyan-700 p-4 text-white">
              <div>
                <h2 className="font-bold">MaamaCare Assistant</h2>
                <p className="mt-1 text-xs text-cyan-100">
                  Scripted maternal health information
                </p>
              </div>
              <button
                aria-label="Close assistant"
                className="rounded-lg px-3 py-2 text-lg hover:bg-white/15"
                onClick={closeAssistant}
                type="button"
              >
                ×
              </button>
            </header>

            <label className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <span className="font-semibold text-slate-700">Language</span>
              <select
                className="max-w-[65%] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                onChange={(event) => changeLanguage(event.target.value as LanguageKey)}
                value={languageKey}
              >
                {LANGUAGE_OPTIONS.map(([key, option]) => (
                  <option key={key} value={key}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>

            <div
              aria-live="polite"
              className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4"
              ref={messageListRef}
            >
              {messages.map((message) => (
                <article
                  className={`max-w-[90%] rounded-2xl p-3 text-sm leading-6 ${
                    message.sender === "mother"
                      ? "ml-auto rounded-tr-sm bg-cyan-800 text-white"
                      : "rounded-tl-sm border border-slate-200 bg-white text-slate-800 shadow-sm"
                  }`}
                  key={message.id}
                >
                  {message.sender === "assistant" && (
                    <p className="mb-1 text-xs font-bold text-cyan-800">
                      {language.name}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  {message.sender === "assistant" && (
                    <button
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-800 hover:underline"
                      onClick={() => speak(message.text)}
                      type="button"
                    >
                      <span aria-hidden="true">🔊</span> Listen
                    </button>
                  )}
                </article>
              ))}
            </div>

            <div className="border-t border-slate-200 bg-white">
              <p className="px-4 pt-3 text-xs leading-5 text-amber-900">
                This scripted content is for general information, not diagnosis.
                If you may be in danger, seek care now or call{" "}
                <a className="font-bold underline" href="tel:112">
                  112
                </a>
                .
                <span className="mt-1 block text-slate-600">
                  Voice questions are in English and may be processed by your
                  browser&apos;s speech service.
                </span>
              </p>
              <div className="flex gap-2 overflow-x-auto px-4 py-3">
                {language.quickChips.map((chip) => (
                  <button
                    className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:border-cyan-700 hover:text-cyan-800"
                    key={chip}
                    onClick={() => submitMessage(chip)}
                    type="button"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              {audioNotice && (
                <p role="status" className="px-4 pb-2 text-xs text-slate-600">
                  {audioNotice}
                </p>
              )}
              <form className="flex gap-2 p-4 pt-0" onSubmit={handleSubmit}>
                <input
                  aria-label="Ask MaamaCare a question"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={language.placeholder}
                  value={draft}
                />
                <button
                  aria-label="Ask by voice in English"
                  className="rounded-xl border border-slate-300 px-3 text-slate-700 hover:bg-slate-50"
                  onClick={startVoiceInput}
                  title="Speak a question in English"
                  type="button"
                >
                  🎙️
                </button>
                <button
                  className="rounded-xl bg-cyan-800 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-900 disabled:opacity-50"
                  disabled={!draft.trim()}
                  type="submit"
                >
                  Send
                </button>
              </form>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
