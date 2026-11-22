// lib/flow/plan.ts
//
// v1.8.9 — build a prompt flow for a main task. Server-only.
//
//   1. Claude (Claude Haiku 5.5 by default) plans the steps through
//      lib/ai/claude.ts — budget-guarded, cached system prompt, JSON schema;
//   2. if Claude is not available for any reason (no key, cap reached, the
//      visitor's daily quota, provider error, unusable answer, a bot), the
//      basic plan from lib/flow/basic.ts takes its place with a `notice`;
//   3. either way every step is routed to its best AI by the deterministic
//      matcher and laid out in levels.
// Never throws. Server-side only (through lib/ai/claude.ts).

import { z } from "zod";
import type { Lang } from "@/lib/domain";
import { matchPrompt } from "@/lib/matcher";
import { neutralizeInjection } from "@/lib/engine/sanitize";
import { callClaudeJson, type AiFailure } from "@/lib/ai/claude";
import type { BudgetStore } from "@/lib/ai/budget";
import { basicDrafts, basicSummary, familyForCategory } from "./basic";
import { clampLine, cleanDrafts } from "./layout";
import { FLOW_JSON_SCHEMA, FLOW_SYSTEM, flowDynamicRules, flowUserMessage } from "./prompt";
import { assembleSteps } from "./route";
import { FLOW_LIMITS, type FlowNotice, type FlowPlan, type FlowStepDraft } from "./types";

export const FLOW_DEFAULT_MODEL = "claude-haiku-5-5";

/** Model, output cap, effort and timeout of the planner call (env-tunable, clamped). */
export function flowCallConfig(env: Record<string, string | undefined> = process.env) {
  const n = (name: string, fallback: number, min: number, max: number) => {
    const v = Number(env[name]);
    return Number.isFinite(v) && v > 0 ? Math.min(max, Math.max(min, Math.floor(v))) : fallback;
  };
  const effortRaw = (env.AI_FLOW_EFFORT ?? "").trim().toLowerCase();
  const effort: "low" | "medium" | "high" = effortRaw === "medium" || effortRaw === "high" ? effortRaw : "low";
  return {
    model: (env.AI_FLOW_MODEL ?? "").trim() || FLOW_DEFAULT_MODEL,
    maxTokens: n("AI_FLOW_MAX_TOKENS", 3500, 1000, 8000),
    effort,
    timeoutMs: n("AI_FLOW_TIMEOUT_MS", 25_000, 5_000, 55_000),
  };
}

const AiFlowSchema = z.object({
  summary: z.string(),
  steps: z
    .array(
      z.object({
        title: z.string(),
        goal: z.string(),
        prompt: z.string(),
        output: z.string(),
        dependsOn: z.array(z.number()),
      })
    )
    .min(FLOW_LIMITS.minSteps),
});

export function noticeFor(reason: AiFailure | "unusable"): FlowNotice {
  switch (reason) {
    case "missing_api_key":
    case "disabled":
      return "no_ai";
    case "budget_month":
    case "budget_day":
      return "budget";
    case "user_quota":
      return "quota";
    // The ledger could not be read or a transaction gave up under contention:
    // transient as far as the visitor can tell ("try again in a while").
    case "store_unavailable":
    case "rate_limited":
    case "timeout":
    case "provider_error":
    case "superseded":
      return "busy";
    default:
      return "error";
  }
}

/** Parse and shape-check Claude's JSON. Null when it is not a usable flow. */
export function parseAiFlow(text: string): { summary: string; drafts: FlowStepDraft[] } | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = AiFlowSchema.safeParse(raw);
  if (!parsed.success) return null;
  const drafts = cleanDrafts(parsed.data.steps);
  if (!drafts) return null;
  return { summary: clampLine(parsed.data.summary, FLOW_LIMITS.maxSummaryChars), drafts };
}

export type BuildFlowArgs = {
  task: string;
  lang: Lang;
  /** Hashed client key (per-visitor daily quota). */
  userKey: string | null;
  /** False for crawlers and non-browser clients: the basic plan, no AI call. */
  llmAllowed: boolean;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  store?: BudgetStore;
  env?: Record<string, string | undefined>;
};

export async function buildFlowPlan(args: BuildFlowArgs): Promise<FlowPlan> {
  const task = args.task.trim().slice(0, FLOW_LIMITS.maxTaskChars);
  const lang = args.lang;
  const env = args.env ?? process.env;

  const basic = (notice: FlowNotice): FlowPlan => {
    const family = familyForCategory(matchPrompt({ prompt: task, uiLang: lang }).detected.categories[0]?.category);
    const drafts = cleanDrafts(basicDrafts(task, lang, family))!;
    const { steps, levels } = assembleSteps(drafts, lang, task);
    return { lang, task, summary: basicSummary(lang, family, steps.length), steps, levels, source: "basic", notice };
  };

  if (!args.llmAllowed) return basic("no_ai");

  // Development only: a fixed "AI" answer so the page can be reviewed without a key.
  if (env.NODE_ENV === "development" && env.FLOW_DEV_FIXTURE === "1") {
    const plan = basic("no_ai");
    return {
      ...plan,
      summary: "Development fixture (FLOW_DEV_FIXTURE=1): the basic plan, shown as if Claude had written it.",
      source: "ai",
      model: `${FLOW_DEFAULT_MODEL} (fixture)`,
      notice: undefined,
    };
  }

  const config = flowCallConfig(env);
  const outcome = await callClaudeJson({
    feature: "flow",
    model: config.model,
    systemCacheable: FLOW_SYSTEM,
    systemDynamic: flowDynamicRules(lang),
    messages: [{ role: "user", content: flowUserMessage(neutralizeInjection(task).clean) }],
    jsonSchema: FLOW_JSON_SCHEMA,
    maxTokens: config.maxTokens,
    effort: config.effort,
    timeoutMs: config.timeoutMs,
    userKey: args.userKey,
    signal: args.signal,
    fetchImpl: args.fetchImpl,
    store: args.store,
    env,
  });
  if (!outcome.ok) return basic(noticeFor(outcome.reason));

  const ai = parseAiFlow(outcome.text);
  if (!ai) return basic("error");
  const { steps, levels } = assembleSteps(ai.drafts, lang, task);
  return { lang, task, summary: ai.summary, steps, levels, source: "ai", model: outcome.model };
}
