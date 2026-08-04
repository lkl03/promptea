"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";

type Props = {
  lang: "es" | "en";
};

const COPY: Record<
  "es" | "en",
  {
    trigger: string;
    title: string;
    intro: string;
    checklistTitle: string;
    checklistBody: string[];
    jsonTitle: string;
    jsonBody: string[];
    recommendationTitle: string;
    recommendation: string[];
    close: string;
  }
> = {
  es: {
    trigger: "¿Cuál conviene?",
    title: "Checklist vs JSON",
    intro: "Las dos versiones contienen el mismo análisis. Solo cambia cómo se entrega el prompt optimizado.",
    checklistTitle: "Checklist (formato normal)",
    checklistBody: [
      "Más fácil de leer y editar a mano.",
      "Ideal para pegar directo en ChatGPT, Claude, Gemini o Grok.",
      "Es la opción que te conviene la mayoría del tiempo.",
    ],
    jsonTitle: "JSON puro",
    jsonBody: [
      "Estructura estricta, parseable con JSON.parse().",
      "Ideal para automatizaciones, APIs, agentes y workflows reproducibles.",
      "Más rígido y menos conversacional.",
    ],
    recommendationTitle: "Recomendación rápida",
    recommendation: [
      "Usá Checklist si vas a pegar el prompt manualmente.",
      "Usá JSON si otra herramienta o pipeline lo va a consumir.",
    ],
    close: "Cerrar",
  },
  en: {
    trigger: "Which one should I use?",
    title: "Checklist vs JSON",
    intro: "Both versions contain the same analysis. Only the way the optimized prompt is delivered changes.",
    checklistTitle: "Checklist (normal format)",
    checklistBody: [
      "Easier to read and tweak by hand.",
      "Best for pasting straight into ChatGPT, Claude, Gemini, or Grok.",
      "The right pick for most use cases.",
    ],
    jsonTitle: "Pure JSON",
    jsonBody: [
      "Strict, parseable with JSON.parse().",
      "Best for automations, APIs, agents, and repeatable workflows.",
      "More rigid and less conversational.",
    ],
    recommendationTitle: "Quick recommendation",
    recommendation: [
      "Use Checklist if you'll paste the prompt manually.",
      "Use JSON if another tool or pipeline will consume it.",
    ],
    close: "Close",
  },
};

export default function FormatExplainModal({ lang }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const copy = COPY[lang];

  useFocusTrap(dialogRef, open);

  function handleClose() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);

    requestAnimationFrame(() => closeRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="text-xs underline decoration-dotted underline-offset-2 text-ink-muted
                   hover:text-ink rounded transition-colors"
      >
        {copy.trigger}
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
              "relative z-10 w-full max-w-md",
              "surface p-5 sm:p-6 shadow-xl",
              "max-h-[88dvh] overflow-y-auto",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="font-title text-lg sm:text-xl font-semibold">
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

            <div className="mt-4 grid gap-3">
              <section className="surface-soft p-3">
                <div className="text-sm font-medium">{copy.checklistTitle}</div>
                <ul className="mt-1 space-y-1 text-sm opacity-85 list-disc pl-5">
                  {copy.checklistBody.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>

              <section className="surface-soft p-3">
                <div className="text-sm font-medium">{copy.jsonTitle}</div>
                <ul className="mt-1 space-y-1 text-sm opacity-85 list-disc pl-5">
                  {copy.jsonBody.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>

              <section className="surface-soft p-3">
                <div className="text-sm font-medium">{copy.recommendationTitle}</div>
                <ul className="mt-1 space-y-1 text-sm opacity-85 list-disc pl-5">
                  {copy.recommendation.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
            </div>

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
