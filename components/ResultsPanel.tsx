// components/ResultsPanel.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "./ToastProvider";

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 7a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3V7Zm3-1a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-7ZM4 8a1 1 0 0 1 2 0v10a1 1 0 0 0 1 1h9a1 1 0 1 1 0 2H7a3 3 0 0 1-3-3V8Z"
      />
    </svg>
  );
}

function ringColor(score: number) {
  if (score < 50) return "text-red-500";
  if (score < 75) return "text-amber-500";
  return "text-emerald-500";
}

function badgeBaseClass() {
  return "inline-flex items-center justify-center shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] leading-none min-w-[64px]";
}

function severityBadgeClass(sev: string) {
  if (sev === "high") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (sev === "medium") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

function severityLabel(sev: string, lang: "es" | "en") {
  if (lang === "es") {
    if (sev === "high") return "alto";
    if (sev === "medium") return "medio";
    return "bajo";
  }
  return sev;
}

function usefulnessFromImpact(impact: string, lang: "es" | "en") {
  if (impact === "high") {
    return {
      label: lang === "es" ? "muy útil" : "very useful",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    };
  }

  if (impact === "medium") {
    return {
      label: lang === "es" ? "útil" : "useful",
      className: "border-sky-500/25 bg-sky-500/10 text-sky-200",
    };
  }

  return {
    label: lang === "es" ? "opcional" : "nice to have",
    className: "border-zinc-400/30 bg-zinc-400/10 text-zinc-200",
  };
}

function confidenceBadge(conf: number, lang: "es" | "en") {
  if (conf >= 75) {
    return {
      label: lang === "es" ? "confianza: alta" : "confidence: high",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    };
  }
  if (conf >= 50) {
    return {
      label: lang === "es" ? "confianza: media" : "confidence: medium",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    };
  }
  return {
    label: lang === "es" ? "confianza: baja" : "confidence: low",
    className: "border-zinc-400/30 bg-zinc-400/10 text-zinc-200",
  };
}

function headlineHuman(result: any, lang: "es" | "en") {
  const score = result?.score ?? 0;
  const findings = (result?.findings ?? []) as Array<{ id?: string; title?: string; severity?: string }>;
  const topHigh = findings.find((f) => f.severity === "high");
  const top = topHigh ?? findings[0];

  const id = String(top?.id ?? "").toLowerCase();
  const title = String(top?.title ?? "").toLowerCase();

  const isMissingContext =
    id.includes("missing_context") || title.includes("missing context") || title.includes("falta contexto");
  const isMissingOutput =
    id.includes("missing_output") ||
    id.includes("no_output_format") ||
    title.includes("output format") ||
    title.includes("formato de salida");
  const isMissingConstraints =
    id.includes("missing_constraints") || title.includes("constraints") || title.includes("restricciones");
  const isTooShort = id.includes("too_short") || title.includes("too short") || title.includes("demasiado corto");

  if (score >= 85) {
    return lang === "es"
      ? "¡Muy bien! Está claro y debería responder de forma consistente."
      : "Nice! It’s clear and should respond consistently.";
  }

  if (score >= 70) {
    if (isMissingOutput) {
      return lang === "es"
        ? "Vas por buen camino. Si definís el formato de respuesta (lista, pasos, tabla o JSON), va a ser más preciso."
        : "You’re close. Defining the output format (bullets, steps, table or JSON) will improve accuracy.";
    }
    if (isMissingContext) {
      return lang === "es"
        ? "Vas por buen camino. Si aclarás el contexto (qué querés y con qué información contás), va a responder mejor."
        : "You’re close. Adding context (goal + available info) will improve the answer.";
    }
    if (isMissingConstraints) {
      return lang === "es"
        ? "Vas por buen camino. Si marcás límites (tono, largo, qué evitar), vas a lograr respuestas más consistentes."
        : "You’re close. Adding constraints (tone, length, what to avoid) will make answers more consistent.";
    }
    if (isTooShort) {
      return lang === "es"
        ? "Vas por buen camino, pero está muy corto. Sumá objetivo + un poco de contexto para que no adivine."
        : "You’re close, but it’s too short. Add a goal + a bit of context so it doesn’t guess.";
    }
    return lang === "es"
      ? "Vas por buen camino. Con un pequeño ajuste vas a conseguir respuestas más claras."
      : "You’re close. One small tweak will make the answer clearer.";
  }

  if (score >= 50) {
    if (isMissingContext) {
      return lang === "es"
        ? "Buen comienzo. Para mejorar, contá el contexto: objetivo, datos de entrada y a quién va dirigido."
        : "Good start. To improve, add context: goal, input data, and audience.";
    }
    if (isMissingOutput) {
      return lang === "es"
        ? "Buen comienzo. Para mejorar, decí cómo querés la respuesta (ej: lista, pasos, tabla o JSON)."
        : "Good start. To improve, specify the output format (bullets, steps, table, or JSON).";
    }
    if (isMissingConstraints) {
      return lang === "es"
        ? "Buen comienzo. Para mejorar, agregá límites: tono, largo, condiciones y qué evitar."
        : "Good start. To improve, add constraints: tone, length, conditions, and what to avoid.";
    }
    if (isTooShort) {
      return lang === "es"
        ? "Buen comienzo, pero está muy corto. Agregá objetivo + contexto para que la IA no complete con suposiciones."
        : "Good start, but it’s too short. Add a goal + context to reduce assumptions.";
    }
    return lang === "es"
      ? "Buen comienzo. Falta una aclaración clave para que la respuesta sea más precisa."
      : "Good start. One key detail is missing to make the answer more accurate.";
  }

  if (isMissingContext) {
    return lang === "es"
      ? "Te falta contexto. Explicá qué querés lograr y qué información tenés disponible."
      : "It needs context. Explain your goal and what information you have.";
  }
  if (isMissingOutput) {
    return lang === "es"
      ? "Te falta definir el formato. Decí si querés lista, pasos, tabla o JSON."
      : "The output format is missing. Choose bullets, steps, table, or JSON.";
  }
  if (isMissingConstraints) {
    return lang === "es"
      ? "Te faltan límites. Aclará tono, largo y qué cosas evitar."
      : "Constraints are missing. Specify tone, length, and what to avoid.";
  }
  if (isTooShort) {
    return lang === "es"
      ? "Está muy corto. Sumá objetivo + contexto para que no tenga que adivinar."
      : "It’s too short. Add a goal + context so it doesn’t guess.";
  }

  return lang === "es"
    ? "Le falta un poco de información. Agregá objetivo, contexto y el formato de salida."
    : "It needs more information. Add goal, context, and an output format.";
}

function QualityRing({ score, label }: { score: number; label: string }) {
  const size = 132;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const clamped = Math.max(0, Math.min(100, score));
  const targetOffset = useMemo(() => circumference * (1 - clamped / 100), [clamped, circumference]);

  const [ready, setReady] = useState(false);
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setReady(false);
    const t = window.setTimeout(() => setReady(true), 60);
    return () => window.clearTimeout(t);
  }, [clamped]);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const duration = 700;
    const from = 0;
    const to = clamped;
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [clamped]);

  const dashOffset = ready ? targetOffset : circumference;

  return (
    <div className="relative h-33 w-33 shrink-0">
      <svg width={size} height={size} className="block">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-zinc-200/40 dark:text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={[ringColor(clamped), "transition-[stroke-dashoffset] duration-700 ease-out"].join(" ")}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-title text-3xl font-semibold leading-none">{display}%</div>
        <div className="mt-1 text-xs opacity-70">{label}</div>
      </div>
    </div>
  );
}

function SkeletonPanel() {
  return (
    <div className="surface p-4 sm:p-5 space-y-4 animate-panel-in">
      <div className="surface-soft p-3 flex items-center justify-between gap-3">
        <div className="h-4 w-64 skeleton" />
        <div className="h-10 w-44 skeleton" />
      </div>

      <div className="flex flex-col gap-4 min-[1920px]:grid min-[1920px]:grid-cols-2">
        <div className="surface-soft p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-33 w-33 rounded-full skeleton" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-3/4 skeleton" />
              <div className="h-3 w-1/3 skeleton" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-4 w-40 skeleton" />
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="h-28 w-full skeleton" />
              <div className="h-28 w-full skeleton" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-4 w-44 skeleton" />
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="h-20 w-full skeleton" />
              <div className="h-20 w-full skeleton" />
            </div>
          </div>
        </div>

        <div className="surface-soft p-4 space-y-2">
          <div className="h-4 w-40 skeleton" />
          <div className="h-105 w-full skeleton rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function ResultsPanel({
  dict,
  lang,
  result,
  isLoading,
  onReset,
}: {
  dict: any;
  lang: "es" | "en";
  result: any;
  isLoading: boolean;
  onReset: () => void;
}) {
  const toast = useToast();

  const [visibleResult, setVisibleResult] = useState<any | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const closeTokenRef = useRef(0);
  const closeTimerRef = useRef<number | null>(null);

  // ✅ Feedback state
  const [feedbackValue, setFeedbackValue] = useState<"yes" | "no" | null>(null);
  const [feedbackReason, setFeedbackReason] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);

  useEffect(() => {
    if (result) {
      setVisibleResult(result);
      setIsClosing(false);

      // reset close timer
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    }
  }, [result]);

  // ✅ FIX: si cambia el idioma (ej /es -> /en), limpiamos resultado “cacheado”
  // para evitar mostrar un análisis viejo en el idioma incorrecto.
  useEffect(() => {
    setVisibleResult(null);
    setIsClosing(false);
    setFeedbackValue(null);
    setFeedbackReason("");
    setSendingFeedback(false);
  }, [lang]);

  // ✅ reset feedback when new analysis arrives (new analysisId)
  const currentAnalysisId = String((visibleResult ?? result)?.meta?.analysisId ?? "");
  useEffect(() => {
    setFeedbackValue(null);
    setFeedbackReason("");
    setSendingFeedback(false);
  }, [currentAnalysisId]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const data = visibleResult ?? result;

  const statsText = useMemo(() => {
    if (!data?.stats) return "";
    const w = Number(data.stats.words ?? 0);
    const t = Number(data.stats.approxTokens ?? 0);
    const wordsLabel = lang === "es" ? "palabras" : "words";
    return `${w} ${wordsLabel} · ~${t} tokens`;
  }, [data, lang]);

  const explainLines = useMemo<string[]>(() => {
    const raw = data?.meta?.scoreExplain;
    if (!Array.isArray(raw)) return [];
    return raw.map((x: any) => String(x ?? "").trim()).filter((x: string) => x.length > 0);
  }, [data]);

  const conf = useMemo(() => {
    const n = Number(data?.meta?.confidence);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
  }, [data]);

  async function handleCopy() {
    if (!data?.optimizedPrompt) return;
    await navigator.clipboard.writeText(data.optimizedPrompt);
    toast.show(lang === "es" ? "Copiado" : "Copied", "success");
  }

  function handleResetClick() {
    if (!data) return;

    setIsClosing(true);
    const token = ++closeTokenRef.current;

    onReset();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        closeTimerRef.current = window.setTimeout(() => {
          if (closeTokenRef.current !== token) return;
          setVisibleResult(null);
          setIsClosing(false);
        }, 360);
      });
    });
  }

  async function sendFeedback(helpful: "yes" | "no") {
    const analysisId = String(data?.meta?.analysisId ?? "").trim();
    if (analysisId.length < 10) {
      toast.show(lang === "es" ? "Falta analysisId (bug)" : "Missing analysisId (bug)", "error");
      return;
    }
    if (sendingFeedback) return;

    setSendingFeedback(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          analysisId,
          helpful,
          reason: helpful === "no" ? (feedbackReason.trim() || null) : null,
        }),
        keepalive: true,
      });

      const json = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(json?.error ?? "Feedback failed");

      setFeedbackValue(helpful);
      toast.show(lang === "es" ? "¡Gracias!" : "Thanks!", "success");
    } catch (e: any) {
      toast.show(e?.message ?? (lang === "es" ? "Error enviando feedback" : "Error sending feedback"), "error");
    } finally {
      setSendingFeedback(false);
    }
  }

  if (isLoading && !data) return <SkeletonPanel />;
  if (!data) return null;

  const headline = explainLines[0] ?? headlineHuman(data, lang);
  const headlineColor = ringColor(data.score ?? 0);
  const explainBullets = explainLines.slice(1, 3);

  const lockedNotice =
    lang === "es"
      ? "El editor está bloqueado para evitar cambios. Tocá “Escribir un nuevo prompt” para empezar de nuevo."
      : "The editor is locked to prevent changes. Click “Write a new prompt” to start over.";

  const canShowFeedback = String(data?.meta?.analysisId ?? "").trim().length >= 10;

  return (
    <div
      className={[
        "surface p-4 sm:p-5 space-y-4",
        isClosing ? "animate-panel-out pointer-events-none" : "animate-panel-in",
      ].join(" ")}
    >
      <div className="surface-soft p-3 items-center justify-between gap-3 hidden sm:flex">
        <div className="text-xs opacity-70 text-center sm:text-start">{lockedNotice}</div>
        <button type="button" className="btn btn-primary h-10 hidden sm:inline-flex" onClick={handleResetClick}>
          {dict.app.newPrompt}
        </button>
      </div>

      {/* ✅ Feedback (sí/no) */}
      {canShowFeedback && (
        <div className="surface-soft p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm opacity-85">
            {lang === "es" ? "¿Te sirvió este análisis?" : "Was this analysis helpful?"}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              className="btn btn-ghost h-9 px-4"
              disabled={sendingFeedback || feedbackValue !== null}
              onClick={() => sendFeedback("yes")}
            >
              {lang === "es" ? "Sí" : "Yes"}
            </button>

            <button
              type="button"
              className="btn btn-ghost h-9 px-4"
              disabled={sendingFeedback || feedbackValue !== null}
              onClick={() => sendFeedback("no")}
            >
              {lang === "es" ? "No" : "No"}
            </button>
          </div>

          {/* opcional: razón (solo antes de enviar "no") */}
          {feedbackValue === null && (
            <div className="w-full sm:max-w-md">
              <input
                className="surface-soft w-full px-3 py-2 text-sm rounded-xl border border-white/10 bg-white/5"
                placeholder={lang === "es" ? "Opcional: ¿qué faltó?" : "Optional: what was missing?"}
                value={feedbackReason}
                onChange={(e) => setFeedbackReason(e.target.value)}
                disabled={sendingFeedback}
              />
            </div>
          )}

          {feedbackValue !== null && (
            <div className="text-xs opacity-70">
              {feedbackValue === "yes"
                ? lang === "es"
                  ? "Feedback enviado: útil"
                  : "Feedback sent: helpful"
                : lang === "es"
                ? "Feedback enviado: no útil"
                : "Feedback sent: not helpful"}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 min-[1920px]:grid min-[1920px]:grid-cols-2 min-[1920px]:items-start">
        {/* LEFT */}
        <div className="surface-soft p-4 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row items-center sm:gap-4">
            <QualityRing score={data.score ?? 0} label={dict.app.quality} />

            <div className="space-y-2 text-center sm:text-start w-full">
              <div className={["text-sm font-medium", headlineColor].join(" ")}>{headline}</div>

              {explainBullets.length > 0 && (
                <ul className="mt-1 space-y-1 text-sm opacity-85">
                  {explainBullets.map((line: string) => (
                    <li key={line} className="flex items-start gap-2 justify-center sm:justify-start">
                      <span className="opacity-50">•</span>
                      <span className="leading-snug">{line}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs opacity-70">
                <span>{statsText}</span>

                {conf !== null && (
                  <span className={[badgeBaseClass(), confidenceBadge(conf, lang).className].join(" ")}>
                    {confidenceBadge(conf, lang).label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {data.findings?.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-center sm:text-start">{dict.app.risks}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.findings.map((f: any) => (
                  <div key={f.id} className="surface-soft p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium">{f.title}</div>
                      <span className={[badgeBaseClass(), severityBadgeClass(f.severity)].join(" ")}>
                        {severityLabel(f.severity, lang)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm opacity-80">{f.description}</div>
                    <div className="mt-2 text-xs opacity-80">
                      <span className="opacity-70">Fix:</span> {f.fix}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.recommendations?.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-center sm:text-start">{dict.app.recommendations}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.recommendations.map((r: any, idx: number) => {
                  const u = usefulnessFromImpact(r.impact, lang);
                  return (
                    <div key={r.id ?? idx} className="surface-soft p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-medium">{r.title}</div>
                        <span className={[badgeBaseClass(), u.className].join(" ")}>{u.label}</span>
                      </div>
                      <div className="mt-1 text-sm opacity-80">{r.detail}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="surface-soft p-4 space-y-2">
          <div className="text-sm font-medium text-center sm:text-start">{dict.app.optimized}</div>
          <div className="relative surface-soft p-4 text-sm whitespace-pre-wrap overflow-auto max-h-105 min-[1920px]:max-h-140">
            {data.optimizedPrompt}
            <button
              type="button"
              className="btn-icon absolute bottom-3 right-3 h-9 w-9"
              aria-label="Copy optimized prompt"
              onClick={handleCopy}
            >
              <CopyIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-center sm:hidden">
        <button type="button" className="btn btn-primary h-10 w-full" onClick={handleResetClick}>
          {dict.app.newPrompt}
        </button>
      </div>
    </div>
  );
}
