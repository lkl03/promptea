// lib/seo/dates.ts
//
// "When did this page's content last change?" — the answer behind sitemap
// <lastmod>, llms.txt "Updated" notes, JSON-LD dateModified and the visible
// "last updated" lines.
//
// Hand-written content (guides, glossary, models, landings, the home/about/
// methodology copy) has no database timestamp, so each group carries the date
// its content was last edited. These are EDITORIAL dates, not build dates:
// bump the matching constant (YYYY-MM-DD) in the same commit that changes the
// content, and nothing else. They are deliberately not `new Date()` — a
// sitemap that claims every URL changed today teaches crawlers to ignore
// <lastmod>.
//
// Data-backed pages take their date from the data instead:
//   - models: the newest `verifiedAt` in the model registry for that target
//   - AI Daily / weekly digest: the article / edition timestamps
//   - benchmarks: the snapshot's `asOf`
// (see lib/seo/registry.ts). The constants here are the fallback when that data
// is unavailable (no Firestore in a local build, no benchmarks snapshot).

import { MODEL_REGISTRY } from "@/lib/models";
import type { TargetAI } from "@/lib/domain";

/** ISO calendar day, e.g. 2026-11-08. */
export type IsoDay = string;

export const CONTENT_UPDATED = {
  home: "2026-11-08",
  about: "2026-11-08",
  methodology: "2026-11-08",
  analyzer: "2026-10-09",
  bestAi: "2026-10-09",
  /** /prompts hub and the six purpose packs. */
  prompts: "2026-08-04",
  guides: "2026-11-08",
  glossary: "2026-11-08",
  models: "2026-11-08",
  landings: "2026-10-09",
  changelog: "2026-11-05",
  privacy: "2026-11-08",
  benchmarks: "2026-11-08",
  /** Bumped when the AI Daily index / weekly archive layout changes, not per article. */
  blogIndex: "2026-11-08",
  weeklyArchive: "2026-11-08",
} as const satisfies Record<string, IsoDay>;

export function isIsoDay(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());
}

/** The newest of several dates/instants (ISO strings); undefined entries are ignored. */
export function newest(...values: Array<string | null | undefined>): string | undefined {
  let best: string | undefined;
  let bestMs = -Infinity;
  for (const v of values) {
    if (!v) continue;
    const ms = new Date(v).getTime();
    if (Number.isNaN(ms)) continue;
    if (ms > bestMs) {
      bestMs = ms;
      best = v;
    }
  }
  return best;
}

/** Newest `verifiedAt` among the selectable registry entries of one target. */
export function modelsVerifiedAt(target?: TargetAI): IsoDay {
  const dates = MODEL_REGISTRY.filter((m) => m.selectable && (target ? m.target === target : true)).map((m) => m.verifiedAt);
  return newest(...dates) ?? CONTENT_UPDATED.models;
}

/** An ISO day or instant → a Date, or the fallback when it is missing/garbage. */
export function toDate(iso: string | null | undefined, fallback: Date): Date {
  if (!iso) return fallback;
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

/** "November 8, 2026" / "8 de noviembre de 2026", UTC so it never shifts a day. */
export function formatDay(iso: string, lang: "es" | "en"): string {
  const d = toDate(iso, new Date(NaN));
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "es" ? "es-AR" : "en-US", { dateStyle: "long", timeZone: "UTC" }).format(d);
}

/** YYYY-MM-DD of an ISO instant or day. */
export function toDay(iso: string): IsoDay {
  return iso.slice(0, 10);
}
