"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Waveform } from "@/components/ui/Waveform";
import { Readout } from "@/components/ui/Readout";
import type { JarvisState } from "./useJarvisState";
import type { StepDef, StepStatus } from "@/lib/types";

const STATUS_TEXT: Record<JarvisState, string> = {
  idle: "STANDING BY",
  listening: "LISTENING",
  thinking: "PROCESSING",
  speaking: "RESPONSE READY",
};

// Minimal ambient SpeechRecognition typings — not in default TS DOM lib.
interface SpeechRecognitionResultLike {
  [index: number]: { [index: number]: { transcript: string } };
}
interface SpeechRecognitionEventLike extends Event {
  results: SpeechRecognitionResultLike;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function speak(text: string, onEnd: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd();
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.02;
  u.pitch = 0.95;
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
}

export function BuddyOrb({
  state,
  to,
  catalog,
  dayStr,
  tomorrowStr,
  onLog,
}: {
  state: JarvisState;
  to: (s: JarvisState) => void;
  catalog: StepDef[];
  dayStr: string;
  tomorrowStr: string | null;
  onLog: (day: string, stepKey: string, status: StepStatus) => void;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(!!getRecognitionCtor() && typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const handleTranscript = useCallback(
    (raw: string) => {
      const text = raw.toLowerCase();
      to("thinking");

      let matched: StepDef | null = null;
      for (const s of catalog) {
        const haystack = [s.step_key, ...s.label.toLowerCase().split(/\s+/)];
        if (haystack.some((w) => w.length > 2 && text.includes(w))) {
          matched = s;
          break;
        }
      }

      const wantsSkip = /\bskip\b/.test(text);
      const wantsTonight = /\btonight\b|\btomorrow\b/.test(text);

      let reply: string;
      if (!matched) {
        reply = "I didn't catch which step. Try again.";
      } else if (wantsSkip) {
        onLog(dayStr, matched.step_key, "skipped");
        reply = `${matched.label} skipped.`;
      } else if (wantsTonight && tomorrowStr) {
        onLog(tomorrowStr, matched.step_key, "done");
        reply = `${matched.label} logged for tonight.`;
      } else {
        onLog(dayStr, matched.step_key, "done");
        reply = `${matched.label} logged.`;
      }

      window.setTimeout(() => {
        to("speaking");
        speak(reply, () => to("idle"));
      }, 420);
    },
    [catalog, dayStr, tomorrowStr, onLog, to]
  );

  const startListening = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-IN";
    rec.onresult = (ev) => {
      const transcript = ev.results[0]?.[0]?.transcript ?? "";
      handleTranscript(transcript);
    };
    rec.onerror = () => to("idle");
    rec.onend = () => {
      if (recRef.current === rec) recRef.current = null;
    };
    recRef.current = rec;
    to("listening");
    rec.start();
  }, [handleTranscript, to]);

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    to("idle");
  }, [to]);

  function onMicTap() {
    if (state === "listening") stopListening();
    else if (state === "idle") startListening();
  }

  return (
    <div className={`buddy-dock${state === "listening" ? " listening" : ""}`}>
      <Waveform active={state === "speaking"} />
      <div className="buddy-status">
        <Readout text={STATUS_TEXT[state]} />
      </div>
      {supported === false ? (
        <div className="buddy-unsupported">Voice unsupported here — tap steps instead</div>
      ) : (
        <button
          type="button"
          className={`buddy-mic${state === "listening" ? " on" : ""}`}
          onClick={onMicTap}
          aria-label={state === "listening" ? "Stop listening" : "Talk to Buddy"}
          disabled={state === "thinking" || state === "speaking"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M9 22h6" />
          </svg>
        </button>
      )}
    </div>
  );
}
