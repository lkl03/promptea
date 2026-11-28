"use client";

// components/agentReady/ScanPipeline.tsx
//
// v1.9.0 — the scan, drawn while it happens: one node per request the scanner
// makes (it lights up when the site answers), then one lane per category that
// fills in check by check. The stage feeds it events at a readable pace; under
// reduced motion they all arrive at once.

import { CHECK_WEIGHTS } from "@/lib/agentReady/weights";
import { CATEGORIES, CHECK_IDS, PROBE_KEYS, type CheckId, type CheckStatus, type ProbeKey } from "@/lib/agentReady/types";
import type { AgentReadyDict } from "@/lib/uiDict";
import { fmt } from "./shared";

export type ProbeState = { ok: boolean; status: number } | undefined;

type Props = {
  dict: AgentReadyDict;
  site: string;
  probes: Partial<Record<ProbeKey, ProbeState>>;
  checks: Partial<Record<CheckId, CheckStatus>>;
};

export default function ScanPipeline({ dict, site, probes, checks }: Props) {
  const t = dict.pipeline;
  const probesDone = PROBE_KEYS.filter((k) => probes[k]).length;
  const checking = probesDone === PROBE_KEYS.length;

  return (
    <div className="surface p-4 sm:p-6" aria-busy="true">
      <p className="font-title text-lg font-semibold break-words">{fmt(t.title, { site })}</p>
      <p className="mt-1 text-sm text-ink-muted" role="status">
        {checking ? t.checking : t.fetching}
      </p>

      <ol className="ar-probes mt-5" aria-label={t.probesAria}>
        {PROBE_KEYS.map((key, i) => {
          const p = probes[key];
          const state = !p ? "pending" : p.ok ? "found" : "missing";
          return (
            <li key={key} className="ar-probe" data-state={state} style={{ ["--i" as string]: i }}>
              <div className="flex items-center gap-2">
                <span className="ar-probe-led" aria-hidden="true" />
                <span className="min-w-0 truncate text-xs font-medium">{t.probes[key]}</span>
              </div>
              <p className="mt-1 h-4 text-[11px] text-ink-muted tabular-nums">{p ? `${p.status || "—"} · ${p.ok ? t.found : t.missing}` : "…"}</p>
            </li>
          );
        })}
      </ol>

      <ul className="m-0 mt-6 grid list-none grid-cols-1 gap-x-6 gap-y-3 p-0 sm:grid-cols-2 lg:grid-cols-3" aria-label={t.checksAria}>
        {CATEGORIES.map((category) => {
          const ids = CHECK_IDS.filter((id) => id.startsWith(`${category}.`));
          const done = ids.filter((id) => checks[id]).length;
          return (
            <li key={category} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-medium">{dict.categories[category]}</span>
                <span className="text-ink-faint tabular-nums">
                  {done}/{ids.length}
                </span>
              </div>
              <div className="ar-lane-track mt-1.5" aria-hidden="true">
                {ids.map((id) => (
                  <span key={id} className="ar-lane-cell" data-status={checks[id]} style={{ ["--w" as string]: CHECK_WEIGHTS[id] }} />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
