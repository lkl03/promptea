// lib/flow/types.ts
//
// v1.8.9 — Prompt flow: one main task at the top, split into a short tree of
// steps (sub-prompts). Steps on the same level can run in parallel; a step
// that depends on others comes below them. Each step carries a ready-to-paste
// prompt and the AI that fits it best (routed by Promptea's own deterministic
// matcher, not by the LLM).
//
// Shared by the API route, the server planner and the client view: plain data,
// no server imports.

import type { Lang, PromptPurpose, TargetAI } from "@/lib/domain";

export const FLOW_LIMITS = {
  /** Characters of the main task the planner accepts. */
  maxTaskChars: 4000,
  minTaskChars: 12,
  minSteps: 2,
  maxSteps: 6,
  maxTitleChars: 90,
  maxGoalChars: 260,
  /** What the planner is asked to stay under… */
  targetPromptChars: 2600,
  /** …and the hard cut (a first step can carry the whole 4,000-character task). */
  maxPromptChars: 6000,
  maxOutputChars: 220,
  maxSummaryChars: 320,
} as const;

/** One step as the planner (AI or basic) writes it. `id` is its 1-based position. */
export type FlowStepDraft = {
  title: string;
  goal: string;
  prompt: string;
  output: string;
  /** Ids of EARLIER steps whose output this step needs. Empty = starts from the main task. */
  dependsOn: number[];
};

export type FlowRoute = {
  target: TargetAI;
  modelId: string;
  modelLabel: string;
  productLabel: string;
  /** One short reason in the page language. */
  reason: string;
  /** Analyzer purpose for the "improve this step" handoff. */
  purpose: PromptPurpose;
};

export type FlowStep = FlowStepDraft & {
  id: number;
  /** 0 = runs first (right under the main task). */
  level: number;
  route: FlowRoute;
};

/** Why the plan is the basic (non-AI) one. */
export const FLOW_NOTICES = ["no_ai", "budget", "quota", "busy", "error"] as const;
export type FlowNotice = (typeof FLOW_NOTICES)[number];

export type FlowSource = "ai" | "basic";

export type FlowPlan = {
  lang: Lang;
  task: string;
  summary: string;
  steps: FlowStep[];
  /** Step ids per level, top to bottom. */
  levels: number[][];
  source: FlowSource;
  /** Claude model id when `source` is "ai". */
  model?: string;
  /** Set when `source` is "basic": why the AI did not write it. */
  notice?: FlowNotice;
};
