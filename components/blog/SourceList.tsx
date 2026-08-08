// components/blog/SourceList.tsx
//
// v1.4.0 — the citation list under every AI Daily article.
//
// Every entry is a real, clickable, absolute https link (the schema rejects
// any other scheme), attributed to a named publisher, with the source's own
// publication date when the page stated one. Nothing here is ever a
// placeholder: if the routine could not name a publisher and a title, the
// payload does not validate and the article is not published.

import { formatEditorialDate } from "@/lib/blog/dates";
import type { Source } from "@/lib/blog/types";

export type SourceListDict = {
  sources: string;
  primarySource: string;
};

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export default function SourceList({
  sources,
  lang,
  dict,
}: {
  sources: Source[];
  lang: "es" | "en";
  dict: SourceListDict;
}) {
  if (sources.length === 0) return null;

  return (
    <section aria-labelledby="article-sources" className="surface p-5">
      <h2 id="article-sources" className="text-sm font-medium">
        {dict.sources}
      </h2>

      <ol className="mt-3 space-y-3">
        {sources.map((source, i) => {
          const host = hostOf(source.url);
          return (
            <li key={`${source.url}-${i}`} className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{source.publisher}</span>
                {source.primary ? (
                  <span className="badge badge-accent">{dict.primarySource}</span>
                ) : null}
                {source.publishedAt ? (
                  <time dateTime={source.publishedAt} className="text-xs opacity-70">
                    {formatEditorialDate(source.publishedAt, lang)}
                  </time>
                ) : null}
              </div>

              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-block underline underline-offset-2 opacity-90 hover:opacity-100 transition-opacity"
              >
                {source.title}
              </a>

              {host ? <div className="text-xs opacity-60">{host}</div> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
