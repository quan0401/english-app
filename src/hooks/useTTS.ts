"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pick the best English voice available.
 * Priority: Google > Apple "Samantha" / "Daniel" > any en-US > any en > default
 */
function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const enVoices = voices.filter(
    (v) => v.lang.startsWith("en") && !v.lang.includes("IN") // exclude Indian English for clarity
  );

  // Prefer these high-quality voices in order
  const preferred = [
    "Google US English",
    "Google UK English Female",
    "Google UK English Male",
    "Samantha",        // macOS / iOS
    "Daniel",          // macOS / iOS British
    "Karen",           // macOS Australian
    "Microsoft Zira",  // Windows
    "Microsoft David", // Windows
  ];

  for (const name of preferred) {
    const match = enVoices.find((v) => v.name.includes(name));
    if (match) return match;
  }

  // Fallback: any en-US voice
  const usVoice = enVoices.find((v) => v.lang === "en-US");
  if (usVoice) return usVoice;

  // Fallback: any English voice
  return enVoices[0] ?? null;
}

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Voices load async in some browsers — listen for the event
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => {
      voiceRef.current = getBestVoice();
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
      utterance.lang = voiceRef.current.lang;
    } else {
      utterance.lang = "en-US";
    }

    utterance.rate = 0.85;  // slightly slower for learners
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak, isSpeaking };
}
