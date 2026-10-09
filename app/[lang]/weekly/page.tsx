// app/[lang]/weekly/page.tsx
//
// v1.7.0 — Promptea Weekly moved into AI Daily ("Weekly digest" section):
// /{lang}/blog/weekly. This route stays as a permanent redirect so links in
// already-delivered emails and external references keep working.

import { notFound, permanentRedirect } from "next/navigation";
import { hasLocale } from "../dictionaries";
import { weeklyArchivePath } from "@/lib/newsletter/paths";

export default async function LegacyWeeklyRedirect({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  permanentRedirect(weeklyArchivePath(lang));
}
