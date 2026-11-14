// lib/analytics/productEvents.ts
//
// v1.8.6 — Vercel Web Analytics custom events for the product's real actions.
//
// Few events, each with at most TWO properties (the Pro plan limit; Hobby does
// not record custom events at all), all from closed enums: never prompt text,
// never a free string.
//
//   Prompt Analyzed  { lang, target }  — an analysis came back
//   Prompt Copied    { lang, target }  — the optimized prompt was copied
//   Target Changed   { lang, target }  — the visitor picked a destination AI
//   Template Copied  { lang, source }  — a template (guide) or saved prompt (library) was copied
//
// Dashboard: Project → Analytics → Events panel → pick the event name to split
// it by property.

import { track } from "@vercel/analytics";
import type { Lang, TargetAI } from "@/lib/domain";
import { isAutomatedBrowser } from "@/lib/telemetry/humanGate";

export type TemplateSource = "guide" | "library";

export type ProductEvent =
  | { name: "Prompt Analyzed"; lang: Lang; target: TargetAI }
  | { name: "Prompt Copied"; lang: Lang; target: TargetAI }
  | { name: "Target Changed"; lang: Lang; target: TargetAI }
  | { name: "Template Copied"; lang: Lang; source: TemplateSource };

export type ProductEventName = ProductEvent["name"];

/** Fire-and-forget; silent on failure and skipped under automation. */
export function trackProductEvent(event: ProductEvent): void {
  if (isAutomatedBrowser()) return;
  const { name, ...props } = event;
  try {
    track(name, props);
  } catch {
    // analytics never breaks the page
  }
}
