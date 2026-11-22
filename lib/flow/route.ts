// lib/flow/route.ts
//
// v1.8.9 — "model routing": each step of a flow gets the AI that fits it best,
// chosen by Promptea's deterministic matcher (lib/matcher), the same engine as
// "Find the best AI". No LLM call, so routing is free and explainable.

import type { Lang } from "@/lib/domain";
import { matchPrompt } from "@/lib/matcher";
import { purposeForCategory } from "@/lib/matcher/handoff";
import { groupByLevel, levelsOf } from "./layout";
import type { FlowRoute, FlowStep, FlowStepDraft } from "./types";

/**
 * The step's own text plus the start of the main task as context: the task
 * carries the domain (research, coding…) and the step says what kind of work
 * this part is. Measured on the basic templates (2026-11-22): with the step
 * text alone most steps of a research flow went to a general model; with the
 * task, the evidence-gathering steps go to a search-first model.
 */
const TASK_CONTEXT_CHARS = 400;

export function routeStep(step: FlowStepDraft, lang: Lang, task = ""): FlowRoute {
  const context = task.trim().slice(0, TASK_CONTEXT_CHARS);
  const text = `${context ? `${context}\n\n` : ""}${step.title}\n${step.goal}\n\n${step.prompt}`;
  const result = matchPrompt({ prompt: text, uiLang: lang });
  const p = result.primary;
  return {
    target: p.target,
    modelId: p.modelId,
    modelLabel: p.modelLabel,
    productLabel: p.productLabel,
    reason: p.reasons[0] ?? "",
    purpose: purposeForCategory(result.detected.categories[0]?.category),
  };
}

/** Drafts (dependencies already normalized) → routed, levelled steps. */
export function assembleSteps(drafts: readonly FlowStepDraft[], lang: Lang, task = ""): { steps: FlowStep[]; levels: number[][] } {
  const levels = levelsOf(drafts.map((d) => d.dependsOn));
  const steps = drafts.map((d, i) => ({ ...d, id: i + 1, level: levels[i]!, route: routeStep(d, lang, task) }));
  return { steps, levels: groupByLevel(levels) };
}
