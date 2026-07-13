"use client";

// Findings + recommendations grids.

import type { AnalyzeResponse } from "@/lib/analyzeClient";

type ResultsDict = Record<string, string>;

function severityBadge(sev: string, dict: ResultsDict) {
  if (sev === "high") return { label: dict.severityHigh, cls: "badge-danger" };
  if (sev === "medium") return { label: dict.severityMedium, cls: "badge-warning" };
  return { label: dict.severityLow, cls: "badge-success" };
}

function impactBadge(impact: string, dict: ResultsDict) {
  if (impact === "high") return { label: dict.impactHigh, cls: "badge-success" };
  if (impact === "medium") return { label: dict.impactMedium, cls: "badge-info" };
  return { label: dict.impactLow, cls: "badge-neutral" };
}

export default function FindingsSection({
  dict,
  result,
}: {
  dict: ResultsDict;
  result: AnalyzeResponse;
}) {
  const findings = result.findings ?? [];
  const recommendations = result.recommendations ?? [];
  if (findings.length === 0 && recommendations.length === 0) return null;

  return (
    <>
      {findings.length > 0 && (
        <section className="space-y-2" aria-label={dict.risksTitle}>
          <h3 className="text-sm font-semibold text-center sm:text-start">{dict.risksTitle}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {findings.map((f) => {
              const b = severityBadge(f.severity, dict);
              return (
                <article key={f.id} className="surface-soft p-3">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-medium">{f.title}</h4>
                    <span className={["badge", b.cls].join(" ")}>{b.label}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{f.description}</p>
                  <p className="mt-2 text-xs text-ink-muted">
                    <span className="text-ink-faint">{dict.fixLabel}</span> {f.fix}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {recommendations.length > 0 && (
        <section className="space-y-2" aria-label={dict.recommendationsTitle}>
          <h3 className="text-sm font-semibold text-center sm:text-start">{dict.recommendationsTitle}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {recommendations.map((r, idx) => {
              const b = impactBadge(r.impact, dict);
              return (
                <article key={r.id ?? idx} className="surface-soft p-3">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-medium">{r.title}</h4>
                    <span className={["badge", b.cls].join(" ")}>{b.label}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{r.detail}</p>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
