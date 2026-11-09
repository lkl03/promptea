"use client";

// components/home/HomePromptBox.tsx
//
// v1.8.0 — the homepage's main action: paste a prompt, go straight to the
// analyzer with it loaded. The page stays statically rendered: nothing is read
// from the URL here, and the hand-off is a plain navigation to
// /{lang}/analyzer?prompt=… (the analyzer already accepts it, up to 6000
// characters). Nothing is sent anywhere until the analyzer's own button is
// pressed. Without JavaScript the form still works: it is a GET form to the
// analyzer with the textarea named "prompt".

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

type Dict = { title: string; label: string; placeholder: string; submit: string; hint: string; tooLong: string };

/** Characters carried in the URL. Percent-encoding can triple this, which still fits every browser and CDN. */
export const HOME_PROMPT_MAX = 1500;

export default function HomePromptBox({ lang, dict }: { lang: "es" | "en"; dict: Dict }) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState("");
  const tooLong = value.length > HOME_PROMPT_MAX;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const prompt = value.trim().slice(0, HOME_PROMPT_MAX);
    router.push(prompt ? `/${lang}/analyzer?prompt=${encodeURIComponent(prompt)}` : `/${lang}/analyzer`);
  }

  return (
    <form action={`/${lang}/analyzer`} method="get" onSubmit={onSubmit} className="surface mx-auto w-full max-w-3xl p-4 sm:p-5" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="font-title text-lg font-semibold sm:text-xl">
        {dict.title}
      </h2>
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
        aria-describedby={`${id}-hint`}
      />
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p id={`${id}-hint`} className="text-xs text-ink-muted" aria-live="polite">
          {tooLong ? dict.tooLong.replace("{n}", String(HOME_PROMPT_MAX)) : dict.hint}
        </p>
        <button type="submit" className="btn btn-primary h-10 shrink-0 px-5">
          {dict.submit} <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}
