"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";

const COPY: Record<
  "es" | "en",
  {
    button: string;
    title: string;
    intro: string;
    steps: Array<{ title: string; body: string }>;
    close: string;
  }
> = {
  es: {
    button: "¿Nuevo? Mirá cómo funciona →",
    title: "Cómo funciona Promptea",
    intro:
      "Tres pasos rápidos para pasar de un prompt vago a una versión optimizada para la IA que estés usando.",
    steps: [
      {
        title: "1. Elegí modelo y tipo de prompt",
        body:
          "Seleccioná la familia de IA (GPT, Claude, Gemini, Grok, DeepSeek, Kimi…) y para qué es el prompt: texto, código, datos, marketing, estudio, imagen, traducción o resumen.",
      },
      {
        title: "2. Pegá o escribí tu prompt",
        body:
          "Pegá el texto del prompt y, si tenés contexto extra (logs, código, datos, notas), adjuntá hasta 3 archivos.",
      },
      {
        title: "3. Revisá el análisis",
        body:
          "Mirá el score, las áreas a mejorar, las preguntas de seguimiento y los riesgos detectados. Ajustá lo crítico y volvé a analizar.",
      },
      {
        title: "4. Copiá el prompt optimizado",
        body:
          "Ya optimizado podés copiarlo y pegarlo en tu IA preferida. La estructura se adapta a cada modelo.",
      },
      {
        title: "5. Elegí el formato",
        body:
          "Modo checklist: ideal para chat con humanos. Modo JSON: ideal para automatizaciones, APIs y workflows.",
      },
    ],
    close: "Cerrar",
  },
  en: {
    button: "New? See how it works →",
    title: "How Promptea works",
    intro: "Three quick steps to turn a vague prompt into an optimized version for the AI you use.",
    steps: [
      {
        title: "1. Pick model and prompt type",
        body:
          "Select the AI family (GPT, Claude, Gemini, Grok, DeepSeek, Kimi…) and what the prompt is for: text, code, data, marketing, study, image, translation, or summarization.",
      },
      {
        title: "2. Paste or write your prompt",
        body: "Paste the prompt and, if you have extra context (logs, code, data, notes), attach up to 3 files.",
      },
      {
        title: "3. Review the analysis",
        body:
          "Check the score, areas to improve, follow-up questions, and detected risks. Fix the critical issues and re-analyze.",
      },
      {
        title: "4. Copy the optimized prompt",
        body: "Once optimized, copy it and paste into your preferred AI. The structure adapts to each model.",
      },
      {
        title: "5. Choose the output format",
        body:
          "Checklist mode: best for chat with humans. Pure JSON mode: best for automations, APIs, and workflows.",
      },
    ],
    close: "Close",
  },
};

export default function HowItWorks({ lang }: { lang: "es" | "en" }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const copy = COPY[lang];

  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    requestAnimationFrame(() => closeRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleClose() {
    setOpen(false);
    // Focus returns to trigger via useFocusTrap cleanup; explicit fallback:
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-line
                   bg-surface-soft px-3 py-1.5
                   text-xs font-medium
                   text-ink-muted hover:text-ink hover:border-line-strong
                   shadow-sm
                   transition-all"
      >
        <span aria-hidden>ⓘ</span>
        <span>{copy.button}</span>
      </button>

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3 py-4"
        >
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden
          />
          <div
            className={[
              "relative z-10 w-full max-w-xl",
              "surface p-5 sm:p-6 shadow-xl",
              "max-h-[88dvh] overflow-y-auto",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="font-title text-xl sm:text-2xl font-semibold">
                  {copy.title}
                </h2>
                <p id={descId} className="mt-1 text-sm opacity-80">
                  {copy.intro}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={handleClose}
                aria-label={copy.close}
                className="btn-icon h-9 w-9 shrink-0"
              >
                ×
              </button>
            </div>

            <ol className="mt-5 space-y-3">
              {copy.steps.map((step) => (
                <li key={step.title} className="surface-soft p-3">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="mt-1 text-sm opacity-85 leading-relaxed">{step.body}</div>
                </li>
              ))}
            </ol>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                className="btn btn-primary h-10 px-5"
                onClick={handleClose}
              >
                {copy.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
