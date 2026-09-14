// components/newsletter/WeeklyEditionView.tsx
//
// Server component: renders a single newsletter edition.
//
// Used by the preview page (app/[lang]/weekly/page.tsx) and will be reused by
// the email renderer in the future. The layout is a single-column editorial
// read at max-width ~680px, matching the AI Daily's text-first aesthetic.
//
// Each top-story card links to its AI Daily article at /[lang]/blog/[slug].
// Tools link to their external URLs. The editorial item and sponsor slot
// render only when present.

import Link from "next/link";
import type { NewsletterEdition } from "@/lib/newsletter/types";

type Props = {
  edition: NewsletterEdition;
  lang: "es" | "en";
  dict: {
    heroLabel: string;
    topStoriesLabel: string;
    toolsLabel: string;
    editorialLabel: string;
    sponsorLabel: string;
    readMore: string;
    editionLabel: string;
  };
};

export default function WeeklyEditionView({ edition, lang, dict }: Props) {
  const content = edition.locales[lang];

  return (
    <div className="space-y-10">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section>
        <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">
          {dict.heroLabel}
        </p>
        <h2 className="font-title mt-3 text-2xl font-semibold leading-tight sm:text-3xl">
          {content.heroHeadline}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-ink-muted sm:text-lg">
          {content.heroDeck}
        </p>
      </section>

      {/* ── Top Stories ───────────────────────────────────────────────── */}
      <section>
        <h2 className="font-title text-lg font-semibold sm:text-xl">
          {dict.topStoriesLabel}
        </h2>
        <div className="mt-4 space-y-4">
          {content.topStories.map((story) => (
            <Link
              key={story.articleSlug}
              href={`/${lang}/blog/${story.articleSlug}`}
              className="surface-soft block p-5 transition-colors hover:border-line-strong"
            >
              <div className="flex items-center gap-2">
                <span className="badge badge-neutral">{story.category}</span>
              </div>
              <h3 className="font-title mt-2 text-base font-semibold leading-snug sm:text-lg">
                {story.headline}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {story.summary}
              </p>
              <p className="mt-2 text-xs text-ink-faint">
                {story.whyItMatters}
              </p>
              <p className="mt-3 text-xs font-medium text-accent">
                {dict.readMore}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Tools and Launches ────────────────────────────────────────── */}
      {content.tools.length > 0 ? (
        <section>
          <h2 className="font-title text-lg font-semibold sm:text-xl">
            {dict.toolsLabel}
          </h2>
          <ul className="mt-4 divide-y divide-line">
            {content.tools.map((tool) => (
              <li key={tool.url} className="py-4 first:pt-0 last:pb-0">
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                >
                  <h3 className="text-sm font-semibold transition-colors group-hover:text-accent">
                    {tool.title}
                    <span
                      className="ml-1.5 inline-block text-ink-faint transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    >
                      ↗
                    </span>
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    {tool.description}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Editorial Item ────────────────────────────────────────────── */}
      {content.editorialTitle && content.editorialBody ? (
        <section className="surface-soft p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-widest text-ink-muted">
            {dict.editorialLabel}
          </p>
          <h2 className="font-title mt-3 text-lg font-semibold sm:text-xl">
            {content.editorialTitle}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted whitespace-pre-line">
            {content.editorialBody}
          </p>
        </section>
      ) : null}

      {/* ── Sponsor ───────────────────────────────────────────────────── */}
      {edition.sponsor ? (
        <section className="border-t border-b border-line py-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-ink-faint">
            {dict.sponsorLabel}
          </p>
          <a
            href={edition.sponsor.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group mt-2 block"
          >
            <p className="text-sm font-semibold transition-colors group-hover:text-accent">
              {edition.sponsor.name}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">
              {edition.sponsor.copy}
            </p>
            <p className="mt-2 text-xs font-medium text-accent">
              {edition.sponsor.label}
              <span className="ml-1 inline-block" aria-hidden="true">
                ↗
              </span>
            </p>
          </a>
        </section>
      ) : null}
    </div>
  );
}
