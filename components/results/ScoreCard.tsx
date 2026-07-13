"use client";

// Score header: animated quality ring + human headline + meta badges.

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalyzeResponse } from "@/lib/analyzeClient";
import { tpl } from "@/components/analyzer/format";

type ResultsDict = Record<string, string>;

export function ringColorClass(score: number) {
  if (score < 50) return "text-danger";
  if (score < 75) return "text-warning";
  return "text-success";
}

function qualitativeLabel(score: number, dict: ResultsDict): string {
  if (score <= 30) return dict.qualityWeak;
  if (score <= 60) return dict.qualityFair;
  if (score <= 85) return dict.qualityGood;
  return dict.qualityExcellent;
}

function QualityRing({ score, label, qualLabel }: { score: number; label: string; qualLabel: string }) {
  const size = 132;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const clamped = Math.max(0, Math.min(100, score));
  const targetOffset = useMemo(() => circumference * (1 - clamped / 100), [clamped, circumference]);

  const [ready, setReady] = useState(false);
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Async (timeout) state updates only — avoids sync-setState-in-effect
    // cascades. The ring animates from empty on each new score.
    const down = window.setTimeout(() => setReady(false), 0);
    const up = window.setTimeout(() => setReady(true), 60);
    return () => {
      window.clearTimeout(down);
      window.clearTimeout(up);
    };
  }, [clamped]);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const duration = 700;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(clamped * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    // rAF is throttled in background tabs — guarantee the final value lands.
    const settle = window.setTimeout(() => setDisplay(clamped), duration + 150);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.clearTimeout(settle);
    };
  }, [clamped]);

  const dashOffset = ready ? targetOffset : circumference;

  return (
    <div className="relative h-33 w-33 shrink-0">
      <svg width={size} height={size} className="block" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={[ringColorClass(clamped), "transition-[stroke-dashoffset] duration-700 ease-out"].join(" ")}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-title text-3xl font-semibold leading-none tabular-nums">{display}%</div>
        <div className="mt-1 text-xs text-ink-muted">{label}</div>
        <div className={["mt-0.5 text-[11px] font-medium", ringColorClass(clamped)].join(" ")}>{qualLabel}</div>
      </div>
    </div>
  );
}

export default function ScoreCard({
  dict,
  lang,
  result,
}: {
  dict: ResultsDict;
  lang: "es" | "en";
  result: AnalyzeResponse;
}) {
  const explainLines = (result.meta.scoreExplain ?? [])
    .map((x) => String(x ?? "").trim())
    .filter((x) => x.length > 0);

  const headline = explainLines[0] ?? "";
  const explainBullets = explainLines.slice(1, 3);

  const conf = Number(result.meta.confidence);
  const confBadge = !Number.isFinite(conf)
    ? null
    : conf >= 75
    ? { label: dict.confidenceHigh, cls: "badge-success" }
    : conf >= 50
    ? { label: dict.confidenceMedium, cls: "badge-warning" }
    : { label: dict.confidenceLow, cls: "badge-neutral" };

  const attachmentsCount = Number(result.meta.attachmentsCount ?? 0);
  const words = Number(result.stats?.words ?? 0);
  const tokens = Number(result.stats?.approxTokens ?? 0);
  const wordsLabel = lang === "es" ? "palabras" : "words";

  return (
    <div className="flex flex-col gap-3 sm:flex-row items-center sm:gap-5">
      <QualityRing
        score={result.score ?? 0}
        label={dict.quality}
        qualLabel={qualitativeLabel(result.score ?? 0, dict)}
      />

      <div className="space-y-2 text-center sm:text-start w-full">
        <p className={["text-[15px] font-medium leading-snug", ringColorClass(result.score ?? 0)].join(" ")}>
          {headline}
        </p>

        {explainBullets.length > 0 && (
          <ul className="space-y-1 text-sm text-ink-muted">
            {explainBullets.map((line) => (
              <li key={line} className="flex items-start gap-2 justify-center sm:justify-start">
                <span className="text-ink-faint" aria-hidden>•</span>
                <span className="leading-snug">{line}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-ink-faint">
          <span className="tabular-nums">{`${words} ${wordsLabel} · ~${tokens} tokens`}</span>
          {confBadge && <span className={["badge", confBadge.cls].join(" ")}>{confBadge.label}</span>}
          {attachmentsCount > 0 && (
            <span className="badge badge-info">
              {tpl(attachmentsCount === 1 ? dict.filesUsed_one : dict.filesUsed_other, { n: attachmentsCount })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
