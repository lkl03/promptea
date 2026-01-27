// components/AppFeedbackButton.tsx
"use client";

import { useMemo, useState } from "react";

function mailtoUrl(body: string) {
  const to = "contact.eterlab@gmail.com";
  const subject = "Feedback Promptea";
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function AppFeedbackButton({ lang }: { lang: "es" | "en" }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const hint = useMemo(() => {
    return lang === "es"
      ? "Esto NO envía nada automáticamente. Al tocar “Abrir email”, se abre tu app de correo con el mensaje pre-cargado, y vos lo enviás."
      : "This does NOT send anything automatically. Clicking “Open email” opens your email app with a pre-filled message, and you send it yourself.";
  }, [lang]);

  const title = lang === "es" ? "Feedback de la app" : "App feedback";
  const placeholder =
    lang === "es"
      ? "Contanos qué te gustó, qué te frustró o qué mejorarías…"
      : "Tell us what you liked, what was frustrating, or what you’d improve…";

  const openEmailLabel = lang === "es" ? "Abrir email" : "Open email";
  const cancelLabel = lang === "es" ? "Cancelar" : "Cancel";

  const body = useMemo(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    return [
      "Feedback Promptea",
      "",
      text.trim(),
      "",
      `URL: ${url}`,
      "",
      "(Podés borrar esto si querés.)",
    ].join("\n");
  }, [text]);

  return (
    <>
      <button
        type="button"
        className="hover:underline underline-offset-4"
        onClick={() => setOpen(true)}
      >
        {lang === "es" ? "Feedback" : "Feedback"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          {/* ✅ overlay más fuerte */}
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* ✅ panel sólido */}
          <div className="relative mx-auto mt-28 w-[min(720px,calc(100%-24px))] rounded-2xl border border-white/10 bg-zinc-950 p-5 text-zinc-100 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="text-sm font-semibold">{title}</div>
              <button
                type="button"
                className="btn-icon h-9 w-9"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            <textarea
              className="mt-4 w-full rounded-2xl border border-white/10 bg-zinc-900/60 p-3 text-sm outline-none focus:ring-2 focus:ring-white/10"
              placeholder={placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
            />

            <div className="mt-3 text-xs text-zinc-300/80">{hint}</div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" className="btn btn-ghost h-10 px-4" onClick={() => setOpen(false)}>
                {cancelLabel}
              </button>
              <a className="btn btn-primary h-10 px-4" href={mailtoUrl(body)} onClick={() => setOpen(false)}>
                {openEmailLabel}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


