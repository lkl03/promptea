"use client";

// components/home/HomePromptBox.tsx
//
// v1.8.0 — the homepage's main action: paste a prompt, go straight to the
// analyzer with it loaded. The page stays statically rendered: nothing is read
// from the URL here. Nothing is sent anywhere until the analyzer's own button
// is pressed.
//
// v1.8.1:
//   - a short explanation under the title says what the box is for and what
//     the visitor gets back (the box itself, its place and its style are
//     unchanged);
//   - the prompt no longer travels in the URL. It is handed to the analyzer
//     through sessionStorage — the same one-shot hand-off the "Best AI" matcher
//     already uses (lib/matcher/handoff.ts, /{lang}/analyzer?handoff=1) — so
//     the text never appears in an address, a referrer or a server log, and
//     the 1,500-character URL cap no longer applies.
//   - Fallbacks: if sessionStorage is blocked the old ?prompt=… navigation is
//     used; without JavaScript the form is a plain GET to the analyzer with the
//     textarea named "prompt" (capped at HOME_PROMPT_MAX).

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { HANDOFF_KEY } from "@/lib/matcher/handoff";
import { type Lang, INTL_LOCALE } from "@/lib/domain";

type Dict = { title: string; explain: string; label: string; placeholder: string; submit: string; hint: string; tooLong: string };

/** Characters carried in the URL by the fallbacks. Percent-encoding can triple this, which still fits every browser and CDN. */
export const HOME_PROMPT_MAX = 1500;
/** The analyzer's own input limit: what the sessionStorage hand-off can carry. */
export const HANDOFF_PROMPT_MAX = 6000;

/** Stores the prompt for the analyzer. False when storage is unavailable (private mode, blocked). */
export function stashPromptForAnalyzer(prompt: string, storage: Pick<Storage, "setItem"> | null): boolean {
  try {
    if (!storage) return false;
    storage.setItem(HANDOFF_KEY, JSON.stringify({ prompt: prompt.slice(0, HANDOFF_PROMPT_MAX) }));
    return true;
  } catch {
    return false;
  }
}

export default function HomePromptBox({ lang, dict }: { lang: Lang; dict: Dict }) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState("");
  const tooLong = value.length > HANDOFF_PROMPT_MAX;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const prompt = value.trim();
    if (!prompt) return router.push(`/${lang}/analyzer`);
    let storage: Storage | null = null;
    try {
      storage = window.sessionStorage;
    } catch {
      storage = null;
    }
    if (stashPromptForAnalyzer(prompt, storage)) return router.push(`/${lang}/analyzer?handoff=1`);
    router.push(`/${lang}/analyzer?prompt=${encodeURIComponent(prompt.slice(0, HOME_PROMPT_MAX))}`);
  }

  return (
    <form action={`/${lang}/analyzer`} method="get" onSubmit={onSubmit} className="surface mx-auto w-full max-w-3xl p-4 sm:p-5" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="font-title text-lg font-semibold sm:text-xl">
        {dict.title}
      </h2>
      <p id={`${id}-explain`} className="mt-1.5 text-sm leading-relaxed text-ink-muted">
        {dict.explain}
      </p>
      <label htmlFor={`${id}-prompt`} className="sr-only">
        {dict.label}
      </label>
      <textarea
        id={`${id}-prompt`}
        name="prompt"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder={dict.placeholder}
        className="field mt-3 block w-full resize-y p-3 text-base sm:text-sm"
        aria-describedby={`${id}-explain ${id}-hint`}
      />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p id={`${id}-hint`} className="text-xs text-ink-muted" aria-live="polite">
          {tooLong ? dict.tooLong.replace("{n}", new Intl.NumberFormat(INTL_LOCALE[lang]).format(HANDOFF_PROMPT_MAX)) : dict.hint}
        </p>
        <button type="submit" className="btn btn-primary h-10 shrink-0 px-5">
          {dict.submit} <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}
