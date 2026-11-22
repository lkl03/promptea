// lib/flow/layout.ts
//
// v1.8.9 — turn the planner's steps into a clean tree: validated dependencies
// and levels. Pure.
//
// Rules (whatever the planner wrote):
//   - a step may depend only on EARLIER steps (no cycles by construction);
//     self-references, unknown and forward ids are dropped, duplicates merged;
//   - level = 1 + the deepest level among its dependencies (0 when none);
//   - steps on one level are independent of each other → "in parallel".

import { FLOW_LIMITS, type FlowStepDraft } from "./types";

export function normalizeDependencies(steps: readonly FlowStepDraft[]): number[][] {
  return steps.map((step, index) => {
    const id = index + 1;
    const deps = Array.isArray(step.dependsOn) ? step.dependsOn : [];
    const clean = deps
      .map((d) => Math.trunc(Number(d)))
      .filter((d) => Number.isFinite(d) && d >= 1 && d < id);
    return [...new Set(clean)].sort((a, b) => a - b);
  });
}

/** Level of each step (index-aligned) from normalized dependencies. */
export function levelsOf(deps: readonly number[][]): number[] {
  const levels: number[] = [];
  deps.forEach((d, index) => {
    levels[index] = d.length === 0 ? 0 : 1 + Math.max(...d.map((id) => levels[id - 1] ?? 0));
  });
  return levels;
}

/** Ids grouped by level, top to bottom, in id order inside a level. */
export function groupByLevel(levels: readonly number[]): number[][] {
  const out: number[][] = [];
  levels.forEach((level, index) => {
    (out[level] ??= []).push(index + 1);
  });
  return out.filter((row) => row && row.length > 0);
}

/** Collapse whitespace runs inside a single-line field and cut to `max` characters. */
export function clampLine(text: string, max: number): string {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

/** Keep line breaks (prompts are multi-line), trim, cut to `max` characters. */
export function clampBlock(text: string, max: number): string {
  const clean = String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** Shape-clean the drafts: field lengths, step count. Returns null when unusable. */
export function cleanDrafts(drafts: readonly FlowStepDraft[]): FlowStepDraft[] | null {
  const usable = drafts
    .slice(0, FLOW_LIMITS.maxSteps)
    .map((d) => ({
      title: clampLine(d.title, FLOW_LIMITS.maxTitleChars),
      goal: clampLine(d.goal, FLOW_LIMITS.maxGoalChars),
      prompt: clampBlock(d.prompt, FLOW_LIMITS.maxPromptChars),
      output: clampLine(d.output, FLOW_LIMITS.maxOutputChars),
      dependsOn: Array.isArray(d.dependsOn) ? d.dependsOn : [],
    }));
  if (usable.length < FLOW_LIMITS.minSteps) return null;
  if (usable.some((d) => d.title.length === 0 || d.prompt.length < 20)) return null;
  const deps = normalizeDependencies(usable);
  return usable.map((d, i) => ({ ...d, dependsOn: deps[i]! }));
}
