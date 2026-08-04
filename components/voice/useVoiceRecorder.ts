"use client";

// components/voice/useVoiceRecorder.ts
//
// Browser recording state machine for voice input. Owns MediaRecorder,
// track cleanup, the upload to /api/transcribe, and the review-before-insert
// transcript. Nothing is ever auto-submitted; the transcript stays local
// until the user decides.

import { useCallback, useEffect, useRef, useState } from "react";
import { trackAppEvent } from "@/lib/telemetry/appEvents.client";
import { TRANSCRIBE_ERROR_REASONS, type TranscribeErrorReason } from "@/lib/domain";

export type VoiceState =
  | "idle"
  | "unsupported"
  | "requesting"
  | "recording"
  | "processing"
  | "review"
  | "error";

export type VoiceErrorKey =
  | "permission_denied"
  | "no_microphone"
  | "unsupported"
  | "insecure_context"
  | "empty_audio"
  | "no_speech"
  | "file_too_large"
  | "recording_too_long"
  | "unsupported_media"
  | "timeout"
  | "rate_limited"
  | "provider_error"
  | "network"
  | "generic";

export const MAX_RECORDING_SECONDS = 120;
const MIN_BLOB_BYTES = 1000;

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickMimeType(): string | null {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return null;
  for (const candidate of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate;
    } catch {
      // keep trying
    }
  }
  return null;
}

function serverReasonToKey(reason: string): VoiceErrorKey {
  switch (reason) {
    case "unsupported_media":
      return "unsupported_media";
    case "file_too_large":
      return "file_too_large";
    case "empty_audio":
      return "empty_audio";
    case "no_speech":
      return "no_speech";
    case "recording_too_long":
      return "recording_too_long";
    case "timeout":
      return "timeout";
    case "rate_limited":
      return "rate_limited";
    case "network":
      return "network";
    case "missing_api_key":
    case "invalid_api_key":
    case "provider_error":
    case "invalid_response":
      return "provider_error";
    default:
      return "generic";
  }
}

export function useVoiceRecorder({ lang }: { lang: "es" | "en" }) {
  const [state, setState] = useState<VoiceState>("idle");
  const [errorKey, setErrorKey] = useState<VoiceErrorKey>("generic");
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  const releaseMedia = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // already stopping
      }
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    chunksRef.current = [];
  }, []);

  // Full cleanup on unmount: tracks, timer, and any in-flight upload.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      abortRef.current?.abort();
      releaseMedia();
    };
  }, [releaseMedia]);

  const failWith = useCallback(
    (key: VoiceErrorKey) => {
      setErrorKey(key);
      setState("error");
      // Typed operational telemetry only — never audio or transcript content.
      const reason = TRANSCRIBE_ERROR_REASONS.includes(key as TranscribeErrorReason)
        ? (key as TranscribeErrorReason)
        : undefined;
      trackAppEvent({ event: "voice_failed", lang, reason });
    },
    [lang]
  );

  const uploadBlob = useCallback(
    async (blob: Blob) => {
      setState("processing");
      const controller = new AbortController();
      abortRef.current = controller;

      const form = new FormData();
      form.append("audio", blob);
      form.append("lang", lang);

      try {
        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => null)) as
          | { ok: true; text: string }
          | { ok: false; reason?: string }
          | null;

        if (cancelledRef.current) return;

        if (res.ok && data && "ok" in data && data.ok && typeof data.text === "string") {
          setTranscript(data.text);
          setState("review");
          trackAppEvent({ event: "voice_transcribed", lang });
          return;
        }
        failWith(serverReasonToKey(String((data as { reason?: string } | null)?.reason ?? "")));
      } catch (err) {
        if (cancelledRef.current || controller.signal.aborted) return;
        const name = (err as { name?: string })?.name ?? "";
        failWith(name === "TypeError" ? "network" : "generic");
      } finally {
        abortRef.current = null;
      }
    },
    [failWith, lang]
  );

  const start = useCallback(async () => {
    if (state === "recording" || state === "processing") return;

    if (typeof window === "undefined") return;
    if (!window.isSecureContext) {
      failWith("insecure_context");
      return;
    }
    const mimeType = pickMimeType();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined" || !mimeType) {
      setState("unsupported");
      return;
    }

    cancelledRef.current = false;
    setTranscript("");
    setElapsed(0);
    setState("requesting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = (err as { name?: string })?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") failWith("permission_denied");
      else if (name === "NotFoundError" || name === "OverconstrainedError") failWith("no_microphone");
      else failWith("generic");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch {
      releaseMedia();
      setState("unsupported");
      return;
    }
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const wasCancelled = cancelledRef.current;
      const blob = new Blob(chunksRef.current, { type: mimeType.split(";")[0] });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      chunksRef.current = [];
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (wasCancelled) return;
      if (blob.size < MIN_BLOB_BYTES) {
        failWith("empty_audio");
        return;
      }
      void uploadBlob(blob);
    };

    recorder.onerror = () => {
      releaseMedia();
      if (!cancelledRef.current) failWith("generic");
    };

    try {
      recorder.start(1000);
    } catch {
      releaseMedia();
      setState("unsupported");
      return;
    }

    setState("recording");
    trackAppEvent({ event: "voice_recording_started", lang });
    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(seconds);
      if (seconds >= MAX_RECORDING_SECONDS && recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    }, 250);
  }, [failWith, lang, releaseMedia, state, uploadBlob]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    releaseMedia();
    setTranscript("");
    setElapsed(0);
    setState("idle");
  }, [releaseMedia]);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    releaseMedia();
    setTranscript("");
    setElapsed(0);
    setState("idle");
    cancelledRef.current = false;
  }, [releaseMedia]);

  return {
    state,
    errorKey,
    elapsed,
    transcript,
    setTranscript,
    start,
    stop,
    cancel,
    reset,
  };
}
