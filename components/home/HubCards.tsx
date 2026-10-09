// components/home/HubCards.tsx
//
// v1.7.0 — the four primary destinations on the hub. Desktop: a 2×2 grid,
// row 1 = Analyze | Best AI, row 2 = AI Daily | Benchmarks. Mobile: one
// column in that same DOM order, so reading order, tab order and visual order
// always agree. Each card is a single link (the whole card is the target, one
// tab stop) wrapping an <h2>, so the cards also appear in heading navigation.

import Link from "next/link";

type CardDict = { title: string; body: string };
type Dict = {
  cardsAria: string;
  cards: { analyze: CardDict; bestAi: CardDict; daily: CardDict; benchmarks: CardDict };
};

function Icon({ name }: { name: "analyze" | "bestAi" | "daily" | "benchmarks" }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "analyze":
      // A prompt bubble with a sparkle: analyze + improve.
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 4v-4h0.5A2.5 2.5 0 0 1 4 12.5z" />
          <path d="M12 6.5v4M10 8.5h4" />
        </svg>
      );
    case "bestAi":
      // A compass: pick the right direction.
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m15.5 8.5-2 5-5 2 2-5z" />
        </svg>
      );
    case "daily":
      // A folded newspaper.
      return (
        <svg {...common}>
          <path d="M5 4h11a1 1 0 0 1 1 1v13a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1z" />
          <path d="M17 8h2a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2" />
          <path d="M8 8h5M8 11.5h5M8 15h3" />
        </svg>
      );
    case "benchmarks":
      // A bar chart with a baseline.
      return (
        <svg {...common}>
          <path d="M4 20h16" />
          <path d="M7 16v-4M12 16V7M17 16v-6" />
        </svg>
      );
  }
}

export default function HubCards({ lang, dict }: { lang: "es" | "en"; dict: Dict }) {
  const cards = [
    { key: "analyze" as const, href: `/${lang}/analyzer`, ...dict.cards.analyze },
    { key: "bestAi" as const, href: `/${lang}/best-ai`, ...dict.cards.bestAi },
    { key: "daily" as const, href: `/${lang}/blog`, ...dict.cards.daily },
    { key: "benchmarks" as const, href: `/${lang}/benchmarks`, ...dict.cards.benchmarks },
  ];

  return (
    <ul aria-label={dict.cardsAria} className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
      {cards.map((card) => (
        <li key={card.key}>
          <Link href={card.href} className="hub-card glass-refract group" data-card={card.key}>
            <span className="hub-card-icon">
              <Icon name={card.key} />
            </span>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-title text-lg font-semibold leading-snug text-ink sm:text-xl">{card.title}</h2>
              <span aria-hidden="true" className="hub-card-arrow text-accent">
                →
              </span>
            </div>
            <p className="text-sm leading-relaxed text-ink-muted">{card.body}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
