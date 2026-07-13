"use client";

// Secondary insights: strengths, quick wins, follow-up questions, model notes.

import type { AnalyzeResponse } from "@/lib/analyzeClient";

type ResultsDict = Record<string, string>;

function stringList(v: unknown, max: number): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, max)
    : [];
}

export default function InsightsSection({
  dict,
  result,
}: {
  dict: ResultsDict;
  result: AnalyzeResponse;
}) {
  const strengths = stringList(result.meta.strengths, 3);
  const quickWins = stringList(result.meta.quickWins, 4);
  const followUps = stringList(result.meta.followUpQuestions, 5);
  const modelNotes = typeof result.meta.modelNotes === "string" ? result.meta.modelNotes : "";

  const hasTop = strengths.length > 0 || quickWins.length > 0;
  const hasBottom = followUps.length > 0 || modelNotes;
  if (!hasTop && !hasBottom) return null;

  return (
    <>
      {hasTop && (
        <div className="grid gap-2 sm:grid-cols-2">
          {strengths.length > 0 && (
            <section className="surface-soft p-3 space-y-2" aria-label={dict.strengthsTitle}>
              <h4 className="text-sm font-medium">{dict.strengthsTitle}</h4>
              <ul className="space-y-1 text-sm text-ink-muted">
                {strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <span aria-hidden className="mt-0.5 text-success">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {quickWins.length > 0 && (
            <section className="surface-soft p-3 space-y-2" aria-label={dict.quickWinsTitle}>
              <h4 className="text-sm font-medium">{dict.quickWinsTitle}</h4>
              <ul className="space-y-1 text-sm text-ink-muted">
                {quickWins.map((q) => (
                  <li key={q} className="flex items-start gap-2">
                    <span aria-hidden className="mt-0.5 text-warning">→</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {hasBottom && (
        <div className="grid gap-2 sm:grid-cols-2">
          {followUps.length > 0 && (
            <section className="surface-soft p-3 space-y-2" aria-label={dict.followUpsTitle}>
              <h4 className="text-sm font-medium">{dict.followUpsTitle}</h4>
              <ul className="space-y-1 text-sm text-ink-muted list-disc pl-5">
                {followUps.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </section>
          )}
          {modelNotes && (
            <section className="surface-soft p-3 space-y-1" aria-label={dict.modelNotesTitle}>
              <h4 className="text-sm font-medium">{dict.modelNotesTitle}</h4>
              <p className="text-sm text-ink-muted leading-relaxed">{modelNotes}</p>
            </section>
          )}
        </div>
      )}
    </>
  );
}
