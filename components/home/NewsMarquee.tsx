"use client";

// components/home/NewsMarquee.tsx
//
// v1.7.0 — the homepage news strip: AI Daily headlines from the last 72 hours
// (selection rules in lib/blog/marquee.ts). The server decides WHAT is shown;
// this island only handles motion.
//
// Accessibility:
//   - The headlines are a real list of links, read once. The second copy that
//     makes the loop seamless is aria-hidden AND inert, so screen readers
//     never hear a headline twice and keyboard users never tab into it.
//   - Motion pauses on hover, on keyboard focus inside the strip, and with an
//     explicit pause/play button (WCAG 2.2.2 for content that moves > 5 s).
//   - prefers-reduced-motion: no animation at all — the strip becomes a
//     horizontally scrollable row.
//   - When every headline fits, nothing moves and nothing is duplicated.

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MarqueeItem } from "@/lib/blog/marquee";

type Dict = { label: string; pause: string; play: string };

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true // server: render the static row; motion starts after hydration
  );
}

function Headlines({ items, lang, hidden }: { items: MarqueeItem[]; lang: "es" | "en"; hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={hidden || undefined} inert={hidden || undefined}>
      {items.map((item) => (
        <li key={item.slug} className="flex shrink-0 items-center gap-8">
          <Link
            href={`/${lang}/blog/${item.slug}`}
            tabIndex={hidden ? -1 : undefined}
            className="whitespace-nowrap text-sm text-ink-muted transition-colors hover:text-ink focus-visible:text-ink"
          >
            {item.title}
          </Link>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-accent opacity-70" />
        </li>
      ))}
    </ul>
  );
}

export default function NewsMarquee({ items, lang, dict }: { items: MarqueeItem[]; lang: "es" | "en"; dict: Dict }) {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const measure = measureRef.current;
    if (!viewport || !measure) return;
    const check = () => setOverflows(measure.scrollWidth > viewport.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  const animate = !reduced && overflows;
  // ~70 px/s regardless of how many headlines there are.
  const duration = `${Math.max(20, Math.round((items.reduce((n, i) => n + i.title.length, 0) * 7.5) / 70))}s`;

  return (
    <section aria-label={dict.label} className="news-marquee surface-soft flex items-center gap-3 px-3 py-2">
      <span className="badge badge-accent shrink-0">{dict.label}</span>

      <div
        ref={viewportRef}
        className={["relative min-w-0 flex-1", animate ? "overflow-hidden news-marquee-mask" : "overflow-x-auto"].join(" ")}
      >
        {/* Off-screen measuring copy decides whether motion is needed. */}
        <div ref={measureRef} aria-hidden="true" inert className="pointer-events-none invisible absolute left-0 top-0 flex w-max">
          <Headlines items={items} lang={lang} hidden />
        </div>

        <div
          className={["flex w-max", animate ? "news-marquee-track" : ""].join(" ")}
          style={animate ? ({ "--marquee-duration": duration, animationPlayState: paused ? "paused" : undefined } as React.CSSProperties) : undefined}
        >
          <Headlines items={items} lang={lang} />
          {animate ? <Headlines items={items} lang={lang} hidden /> : null}
        </div>
      </div>

      {animate ? (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          aria-label={paused ? dict.play : dict.pause}
          title={paused ? dict.play : dict.pause}
          className="btn-icon h-7 w-7 shrink-0"
        >
          {paused ? (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          )}
        </button>
      ) : null}
    </section>
  );
}
