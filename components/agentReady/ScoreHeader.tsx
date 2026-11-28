"use client";

// components/agentReady/ScoreHeader.tsx
//
// v1.9.0 — the result at a glance: the score on a dial that fills up, the level
// in words, one bar per category, and the actions on the audit.

import { useEffect, useState } from "react";

import type { Audit } from "@/lib/agentReady/types";
import type { AgentReadyDict } from "@/lib/uiDict";
import { fmt, hostOf, useReducedMotion } from "./shared";

const R = 52;
const CIRC = 2 * Math.PI * R;

function useCountUp(target: number, reduced: boolean): number {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the count-up is skipped under reduced motion
      setShown(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 1100);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(from + (target - from) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced]);
  return shown;
}

type Props = {
  dict: AgentReadyDict;
  audit: Audit;
  lang: string;
  canShare: boolean;
  busy: boolean;
  onRescan: () => void;
  onNew: () => void;
  onShare: () => void;
};

export default function ScoreHeader({ dict, audit, lang, canShare, busy, onRescan, onNew, onShare }: Props) {
  const t = dict.score;
  const reduced = useReducedMotion();
  const shown = useCountUp(audit.score, reduced);
  // The ring starts empty and fills after mount, so the transition has something to animate.
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const offset = CIRC * (1 - (filled ? audit.score : 0) / 100);
  const level = t.levels[audit.level];
  const date = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(audit.scannedAt));

  return (
    <section className="surface ar-reveal p-4 sm:p-6" aria-label={t.label}>
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
        <div className="ar-dial" data-level={audit.level} role="img" aria-label={fmt(t.aria, { score: audit.score, level })}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle className="ar-dial-track" cx="60" cy="60" r={R} />
            <circle className="ar-dial-value" cx="60" cy="60" r={R} strokeDasharray={CIRC} strokeDashoffset={offset} />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center" aria-hidden="true">
            <div>
              <div className="font-title text-4xl font-semibold leading-none tabular-nums">{shown}</div>
              <div className="mt-1 text-[11px] text-ink-faint">{t.outOf}</div>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 text-center md:text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t.label}</p>
          <h2 className="mt-1 font-title text-2xl font-semibold break-words">{hostOf(audit.pageUrl)}</h2>
          <p className="mt-1 text-sm">
            <span className="font-semibold">{level}.</span> <span className="text-ink-muted">{t.levelHints[audit.level]}</span>
          </p>
          <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-ink-faint md:justify-start">
            <span>
              {t.stack}: <span className="text-ink-muted">{t.stacks[audit.stack]}</span>
            </span>
            <span>{fmt(t.scanned, { date })}</span>
            <span>{fmt(dict.pipeline.summary, { n: audit.requests, ms: audit.durationMs })}</span>
          </p>

          <ul className="m-0 mt-4 grid list-none grid-cols-2 gap-x-5 gap-y-2.5 p-0 text-left sm:grid-cols-3">
            {audit.categories.map((c) => (
              <li key={c.category} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate font-medium">{dict.categories[c.category]}</span>
                  <span className="text-ink-faint tabular-nums">
                    {c.points % 1 === 0 ? c.points : c.points.toFixed(1)}/{c.max}
                  </span>
                </div>
                <div className="ar-bar mt-1" aria-hidden="true">
                  <span style={{ ["--v" as string]: `${filled ? c.score : 0}%`, ["--bar" as string]: c.score >= 80 ? "var(--success)" : c.score >= 40 ? "var(--warning)" : "var(--danger)" }} />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <button type="button" className="btn btn-ghost h-9" onClick={onRescan} disabled={busy}>
              {t.rescan}
            </button>
            <button type="button" className="btn btn-ghost h-9" onClick={onNew} disabled={busy}>
              {t.newScan}
            </button>
            {canShare ? (
              <button type="button" className="btn btn-ghost h-9" onClick={onShare} title={t.shareHint}>
                {t.share}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
