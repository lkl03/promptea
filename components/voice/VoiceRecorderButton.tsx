"use client";

// components/voice/VoiceRecorderButton.tsx
//
// Reusable voice-input control for both product modes. Mic button → record
// with timer → transcribe → REVIEW step (editable) → user chooses insert,
// append, or discard. Never auto-submits an analysis.

import { useId } from "react";
import { useVoiceRecorder, MAX_RECORDING_SECONDS, type VoiceErrorKey } from "./useVoiceRecorder";
import type { VoiceDict } from "@/lib/uiDict";

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function errorText(dict: VoiceDict, key: VoiceErrorKey): string {
  switch (key) {
    case "permission_denied":
      return dict.errorPermissionDenied;
    case "no_microphone":
      return dict.errorNoMicrophone;
    case "unsupported":
      return dict.errorUnsupported;
    case "insecure_context":
      return dict.errorInsecureContext;
    case "empty_audio":
      return dict.errorEmptyAudio;
    case "no_speech":
      return dict.errorNoSpeech;
    case "file_too_large":
      return dict.errorTooLarge;
    case "recording_too_long":
      return dict.errorTooLong;
    case "unsupported_media":
      return dict.errorUnsupportedMedia;
    case "timeout":
      return dict.errorTimeout;
    case "rate_limited":
      return dict.errorRateLimited;
    case "provider_error":
      return dict.errorProvider;
    case "network":
      return dict.errorNetwork;
    default:
      return dict.errorGeneric;
  }
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  );
}

export type VoiceRecorderButtonProps = {
  lang: "es" | "en";
  dict: VoiceDict;
  disabled?: boolean;
  hasExistingText: boolean;
  onInsert: (text: string) => void;
  onAppend: (text: string) => void;
};

export default function VoiceRecorderButton({
  lang,
  dict,
  disabled = false,
  hasExistingText,
  onInsert,
  onAppend,
}: VoiceRecorderButtonProps) {
  const { state, errorKey, elapsed, transcript, setTranscript, start, stop, cancel, reset } =
    useVoiceRecorder({ lang });
  const reviewId = useId();

  const recording = state === "recording";
  const busy = state === "requesting" || state === "processing";

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-icon relative"
          aria-label={recording ? dict.stop : dict.start}
          title={recording ? dict.stop : dict.start}
          aria-pressed={recording}
          disabled={disabled || busy || state === "unsupported" || state === "review"}
          onClick={() => (recording ? stop() : void start())}
        >
          {recording ? <StopIcon className="h-4 w-4 text-danger" /> : <MicIcon className="h-4 w-4" />}
          {recording && (
            <span
              aria-hidden="true"
              className="rec-pulse motion-reduce:animate-none absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-danger"
            />
          )}
        </button>

        {/* Status region: idle explainer / recording timer / processing note / errors. */}
        <div aria-live="polite" className="min-w-0 flex-1 text-xs">
          {state === "idle" && <span className="text-ink-faint">{dict.hint}</span>}
          {recording && (
            <span className="inline-flex items-center gap-2 text-ink-muted">
              <span className="font-medium text-danger">{dict.recording}</span>
              <span className="tabular-nums">{formatTime(elapsed)} / {formatTime(MAX_RECORDING_SECONDS)}</span>
              <span className="hidden sm:inline text-ink-faint">{dict.limitsHint}</span>
            </span>
          )}
          {state === "processing" && <span className="text-ink-muted">{dict.processing}</span>}
          {state === "unsupported" && <span className="text-danger">{dict.errorUnsupported}</span>}
          {state === "error" && (
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className="text-danger">{errorText(dict, errorKey)}</span>
              <button type="button" className="underline underline-offset-2 text-ink-muted hover:text-ink" onClick={() => void start()}>
                {dict.retry}
              </button>
            </span>
          )}
        </div>

        {(recording || busy) && (
          <button type="button" className="btn btn-ghost h-8 px-3 text-xs" onClick={cancel}>
            {dict.cancel}
          </button>
        )}
      </div>

      {/* Review step: nothing reaches the prompt until the user decides. */}
      {state === "review" && (
        <div className="surface-soft mt-2 p-3 animate-toast-in">
          <label htmlFor={reviewId} className="text-xs font-medium text-ink-muted">
            {dict.reviewTitle}
          </label>
          <p className="mt-0.5 text-[11px] text-ink-faint">{dict.reviewHint}</p>
          <textarea
            id={reviewId}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={4}
            className="field mt-2 w-full resize-y p-2.5"
          />
          <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
            <button type="button" className="btn btn-ghost h-8 px-3 text-xs" onClick={reset}>
              {dict.discard}
            </button>
            {hasExistingText && (
              <button
                type="button"
                className="btn btn-secondary h-8 px-3 text-xs"
                disabled={transcript.trim().length === 0}
                onClick={() => {
                  onAppend(transcript.trim());
                  reset();
                }}
              >
                {dict.append}
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary h-8 px-3 text-xs"
              disabled={transcript.trim().length === 0}
              onClick={() => {
                onInsert(transcript.trim());
                reset();
              }}
            >
              {dict.insert}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
