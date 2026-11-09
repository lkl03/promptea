// components/seo/DocSections.tsx
//
// Server-rendered body of a PageDoc (lib/seo/content/sitePages.ts): the
// answer-first summary, the sections, the FAQ and the "last updated" line. Used
// by /about, /methodology and the crawlable block on the home page, so the text
// that search engines and AI assistants read is plain HTML in the first response.

import Link from "next/link";

import type { DocBlock, PageDoc } from "@/lib/seo/content/sitePages";
import { formatDay } from "@/lib/seo/dates";
import type { Locale } from "@/lib/seo/site";

function isInternalPage(href: string): boolean {
  return href.startsWith("/") && !/\.(txt|xml|md)$/.test(href);
}

function Block({ b }: { b: DocBlock }) {
  switch (b.type) {
    case "p":
      return <p className="text-sm leading-relaxed text-ink-muted sm:text-base">{b.text}</p>;
    case "ul":
      return (
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-muted sm:text-base">
          {b.items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-muted sm:text-base">
          {b.items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ol>
      );
    case "steps":
      return (
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-muted sm:text-base">
          {b.items.map((x) => (
            <li key={x.name}>
              <strong className="font-medium text-ink">{x.name}.</strong> {x.text}
            </li>
          ))}
        </ol>
      );
    case "dl":
      return (
        <dl className="grid gap-2 sm:grid-cols-2">
          {b.items.map((x) => (
            <div key={x.term} className="surface-soft rounded-2xl p-3">
              <dt className="text-sm font-medium text-ink">{x.term}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-muted">{x.text}</dd>
            </div>
          ))}
        </dl>
      );
    case "links":
      return (
        <ul className="flex flex-wrap gap-2">
          {b.items.map((x) => (
            <li key={x.href}>
              {isInternalPage(x.href) ? (
                <Link href={x.href} className="btn h-9 px-4">
                  {x.label}
                </Link>
              ) : (
                <a href={x.href} className="btn h-9 px-4">
                  {x.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      );
  }
}

export default function DocSections({
  doc,
  lang,
  idPrefix = "",
  headingLevel = 2,
  showTldr = true,
}: {
  doc: PageDoc;
  lang: Locale;
  idPrefix?: string;
  /** Level of the section headings (the home block sits under its own h2). */
  headingLevel?: 2 | 3;
  showTldr?: boolean;
}) {
  const H = (headingLevel === 2 ? "h2" : "h3") as "h2" | "h3";
  const FaqH = (headingLevel === 2 ? "h2" : "h3") as "h2" | "h3";
  const es = lang === "es";

  return (
    <>
      {showTldr ? (
        <p className="surface-soft mt-4 rounded-2xl p-4 text-sm leading-relaxed sm:text-base">
          <strong className="font-semibold">{es ? "En breve: " : "In short: "}</strong>
          {doc.tldr}
        </p>
      ) : null}

      <div className="mt-8 space-y-8">
        {doc.sections.map((s) => (
          <section key={s.id} id={`${idPrefix}${s.id}`} aria-labelledby={`${idPrefix}${s.id}-title`} className="scroll-mt-24">
            <H id={`${idPrefix}${s.id}-title`} className="font-title text-xl font-semibold sm:text-2xl">
              {s.heading}
            </H>
            <div className="mt-3 space-y-3">
              {s.blocks.map((b, i) => (
                <Block key={i} b={b} />
              ))}
            </div>
          </section>
        ))}

        {doc.faq.length > 0 ? (
          <section id={`${idPrefix}faq`} aria-labelledby={`${idPrefix}faq-title`} className="scroll-mt-24">
            <FaqH id={`${idPrefix}faq-title`} className="font-title text-xl font-semibold sm:text-2xl">
              {es ? "Preguntas frecuentes" : "Frequently asked questions"}
            </FaqH>
            <div className="mt-3 space-y-2">
              {doc.faq.map((f) => (
                <details key={f.q} className="surface-soft rounded-2xl p-3">
                  <summary className="cursor-pointer text-sm font-medium sm:text-base">{f.q}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted sm:text-base">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <p className="mt-8 text-xs text-ink-faint">
        {es ? "Última actualización: " : "Last updated: "}
        <time dateTime={doc.updated}>{formatDay(doc.updated, lang)}</time>
      </p>
    </>
  );
}
