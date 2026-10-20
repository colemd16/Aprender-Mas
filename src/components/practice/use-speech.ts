"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

// Speech-to-text through the browser's own recognition (Chrome, Edge, Safari).
// Hidden where it isn't supported.

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
};
type RecognitionCtor = new () => Recognition;

const getCtor = () =>
  typeof window === "undefined" ? undefined : ((window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition);

const subscribe = () => () => {};

export function useSpeech(onText: (text: string) => void) {
  const supported = useSyncExternalStore(subscribe, () => !!getCtor(), () => false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);

  const stop = useCallback(() => recognition.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "es-CO"; // Colombian Spanish; recognizes other Latin American accents too
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ")
        .trim();
      onText(text);
    };
    rec.onerror = (e) => setError(e.error === "not-allowed" ? "Microphone access is blocked for this site." : "Didn't catch that — try again.");
    rec.onend = () => setListening(false);
    recognition.current = rec;
    setError(null);
    setListening(true);
    rec.start();
  }, [onText]);

  return { supported, listening, error, start, stop };
}
