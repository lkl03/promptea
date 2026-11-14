"use client";

// components/guides/CopyTemplateButton.tsx
//
// v1.8.6 — copies a guide template to the clipboard and records the
// "Template Copied" custom event ({ lang, source: "guide" }; never the text).
// Before this the only action on a template was "Open in Promptea".

import { useEffect, useRef, useState } from "react";
import { pick, type Lang } from "@/lib/domain";
import { trackProductEvent } from "@/lib/analytics/productEvents";

export default function CopyTemplateButton({ lang, text, title }: { lang: Lang; text: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const label = pick(lang, { es: "Copiar", en: "Copy", pt: "Copiar" });
  const doneLabel = pick(lang, { es: "Copiado", en: "Copied", pt: "Copiado" });

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return; // clipboard blocked: nothing to confirm
    }
    trackProductEvent({ name: "Template Copied", lang, source: "guide" });
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {/* Visible label first in the accessible name, plus the template title (WCAG 2.5.3 / 2.4.4). */}
      <button type="button" onClick={copy} className="btn btn-ghost h-9 px-3" aria-label={`${copied ? doneLabel : label}: ${title}`}>
        {copied ? doneLabel : label}
      </button>
      <span className="sr-only" role="status">
        {copied ? doneLabel : ""}
      </span>
    </>
  );
}
