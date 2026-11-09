// components/seo/PageMeta.tsx
//
// The small "Last updated · Markdown version" line under a content page's
// heading: a visible freshness signal for readers and crawlers (the same date
// goes into dateModified in the page's JSON-LD) and the entry point to the
// clean markdown twin that AI assistants prefer.

import type { Locale } from "@/lib/seo/site";
import { formatDay } from "@/lib/seo/dates";

export default function PageMeta({ lang, updated, markdownPath }: { lang: Locale; updated: string; markdownPath?: string }) {
  const es = lang === "es";
  return (
    <p className="text-xs text-ink-faint">
      {es ? "Última actualización: " : "Last updated: "}
      <time dateTime={updated}>{formatDay(updated, lang)}</time>
      {markdownPath ? (
        <>
          {" · "}
          <a href={markdownPath} className="underline-offset-2 hover:underline">
            {es ? "Versión en markdown" : "Markdown version"}
          </a>
        </>
      ) : null}
    </p>
  );
}
