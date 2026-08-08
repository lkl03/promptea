// components/blog/AiDailyPromo.tsx
//
// v1.4.1 — compact AI Daily promo for the analyzer homepage.
//
// Deliberately static. The brief allows a marquee, but this sits on the primary
// conversion surface, a few hundred pixels above the prompt textarea: a
// permanently moving element there competes with the input for attention and
// would need a `prefers-reduced-motion` escape hatch that only ever degrades to
// the static version anyway. So the static version *is* the design — the accent
// badge carries the "new" signal, and the only transition is a hover colour
// change, matching HowItWorks and the blog cards.
//
// Server component: no client JS, no images, fixed intrinsic height → no layout
// shift. The whole pill is one Link, so there is exactly one tab stop and its
// accessible name is the badge + section name + blurb + CTA.

import Link from "next/link";

export type AiDailyPromoDict = {
  badge: string;
  title: string;
  blurb: string;
  cta: string;
};

export default function AiDailyPromo({
  lang,
  dict,
}: {
  lang: "es" | "en";
  dict: AiDailyPromoDict;
}) {
  return (
    <div className="flex justify-center">
      <Link
        href={`/${lang}/blog`}
        className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1
                   rounded-full border border-line bg-surface-soft px-3 py-1.5
                   text-xs text-ink-muted
                   hover:border-line-strong hover:text-ink
                   transition-colors"
      >
        <span className="badge badge-accent">{dict.badge}</span>
        <span className="font-title font-semibold text-ink">{dict.title}</span>
        <span aria-hidden="true" className="hidden opacity-40 md:inline">
          ·
        </span>
        <span className="hidden opacity-80 md:inline">{dict.blurb}</span>
        <span className="font-medium text-accent">{dict.cta} →</span>
      </Link>
    </div>
  );
}
