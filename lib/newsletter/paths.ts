// lib/newsletter/paths.ts
//
// v1.7.0 — where Promptea Weekly lives on the site. Since v1.7.0 the weekly
// digest is a section of AI Daily ("Resumen semanal" / "Weekly digest"):
//
//   /{lang}/blog/weekly            archive of every published edition
//   /{lang}/blog/weekly/{monday}   one edition, shareable (Monday = edition id date)
//
// The pre-1.7 page /{lang}/weekly permanently redirects to the archive, so
// links in emails already delivered keep working.

import type { Lang } from "@/lib/domain";
import { isEditorialDate } from "@/lib/blog/dates";

const EDITION_ID_RE = /^promptea-weekly_(\d{4}-\d{2}-\d{2})$/;

export function weeklyArchivePath(lang: Lang): string {
  return `/${lang}/blog/weekly`;
}

/** The Monday an edition id is keyed by, or null for a malformed id. */
export function editionMonday(editionId: string): string | null {
  const m = EDITION_ID_RE.exec(editionId);
  return m && isEditorialDate(m[1]) ? m[1] : null;
}

export function editionIdForMonday(monday: string): string | null {
  return isEditorialDate(monday) ? `promptea-weekly_${monday}` : null;
}

export function weeklyEditionPath(lang: Lang, editionId: string): string {
  const monday = editionMonday(editionId);
  return monday ? `${weeklyArchivePath(lang)}/${monday}` : weeklyArchivePath(lang);
}
