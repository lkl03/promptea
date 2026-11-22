// lib/flow/markdown.ts
//
// v1.8.9 — the whole flow as Markdown, for "Copy the flow". Pure.

import { PUNCT, type Lang } from "@/lib/domain";
import type { FlowPlan } from "./types";

export type FlowMarkdownDict = {
  copyAllTitle: string;
  rootLabel: string;
  stepLabel: string;
  bestAi: string;
  usesLabel: string;
  and: string;
  outputLabel: string;
  parallelTag: string;
};

/** "claude-haiku-5-5" → "Claude Haiku 5.5" (anything after a space, like "(fixture)", is kept). */
export function claudeModelName(id: string | undefined): string {
  if (!id) return "Claude";
  const [base, ...rest] = id.trim().split(" ");
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d+))?$/i.exec(base ?? "");
  if (!m) return id;
  const family = m[1]!.charAt(0).toUpperCase() + m[1]!.slice(1).toLowerCase();
  const name = `Claude ${family} ${m[2]}${m[3] ? `.${m[3]}` : ""}`;
  return rest.length ? `${name} ${rest.join(" ")}` : name;
}

/** "1 y 2", "1, 2 and 3", "1和2". */
export function joinIds(ids: readonly number[], lang: Lang, and: string, label: (n: number) => string): string {
  const items = ids.map(label);
  if (items.length <= 1) return items.join("");
  const sep = lang === "zh" ? "、" : ", ";
  const glue = lang === "zh" ? and : ` ${and} `;
  return `${items.slice(0, -1).join(sep)}${glue}${items[items.length - 1]}`;
}

export function flowToMarkdown(plan: FlowPlan, dict: FlowMarkdownDict): string {
  const colon = PUNCT[plan.lang].colon;
  const stepName = (n: number) => dict.stepLabel.replace("{n}", String(n));
  const parallelLevels = new Set(plan.levels.filter((row) => row.length > 1).flat());
  const lines: string[] = [`# ${dict.copyAllTitle}`, "", `**${dict.rootLabel}**${colon}${plan.task}`, "", plan.summary, ""];
  for (const step of plan.steps) {
    const tag = parallelLevels.has(step.id) ? ` · ${dict.parallelTag}` : "";
    lines.push(`## ${stepName(step.id)}${colon}${step.title}${tag}`, "");
    lines.push(step.goal, "");
    lines.push(`- ${dict.bestAi}${colon}${step.route.productLabel}`);
    if (step.dependsOn.length > 0) {
      lines.push(`- ${dict.usesLabel.replace("{steps}", joinIds(step.dependsOn, plan.lang, dict.and, stepName))}`);
    }
    lines.push(`- ${dict.outputLabel}${colon}${step.output}`, "");
    lines.push("```text", step.prompt, "```", "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}
