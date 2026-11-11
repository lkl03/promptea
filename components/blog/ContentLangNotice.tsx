// components/blog/ContentLangNotice.tsx
//
// v1.8.2 — AI Daily and the weekly summary are written in Spanish and English.
// Under an interface language without an edition of its own (Portuguese) the
// page shows the English original and says so, with a link to each language the
// content exists in. Renders nothing for /es and /en.

import Link from "next/link";

import { CONTENT_LANGS, LANG_NAME, LANG_TAG, contentIsFallback, type ContentLang, type Lang } from "@/lib/domain";

export default function ContentLangNotice({
  lang,
  text,
  hrefs,
  className = "",
}: {
  lang: Lang;
  /** The translated notice (dict.blog.langNotice). */
  text: string;
  /** Where the same content lives in each language it was written in. */
  hrefs: Record<ContentLang, string>;
  className?: string;
}) {
  if (!contentIsFallback(lang)) return null;

  return (
    <aside role="note" data-content-lang-notice className={["surface-soft border-l-4 p-4 text-sm", className].join(" ")}>
      <p>{text}</p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {CONTENT_LANGS.map((cl) => (
          <Link key={cl} href={hrefs[cl]} hrefLang={LANG_TAG[cl]} lang={LANG_TAG[cl]} className="underline underline-offset-2 hover:opacity-80">
            {LANG_NAME[cl]}
          </Link>
        ))}
      </p>
    </aside>
  );
}
