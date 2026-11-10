// components/seo/PageMeta.tsx
//
// The small "Last updated · Markdown version" line under a content page's
// heading: a visible freshness signal for readers and crawlers (the same date
// goes into dateModified in the page's JSON-LD) and the entry point to the
// clean markdown twin that AI assistants prefer.

import type { Locale } from "@/lib/seo/site";
import { formatDay } from "@/lib/seo/dates";
import { pick } from "@/lib/domain";

export default function PageMeta({ lang, updated, markdownPath }: { lang: Locale; updated: string; markdownPath?: string }) {
  return (
    <p className="text-xs text-ink-faint">
      {pick(lang, { es: "Última actualización: ", en: "Last updated: ", pt: "Última atualização: " })}
      <time dateTime={updated}>{formatDay(updated, lang)}</time>
      {markdownPath ? (
        <>
          {" · "}
          <a href={markdownPath} className="underline-offset-2 hover:underline">
            {pick(lang, { es: "Versión en markdown", en: "Markdown version", pt: "Versão em Markdown" })}
          </a>
        </>
      ) : null}
    </p>
  );
}
