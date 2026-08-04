// lib/matcher/handoff.ts
//
// Matcher → optimizer handoff contract. The payload travels through
// sessionStorage (key below); the /?handoff=1 flag tells PromptBox to read
// it. Kept in lib so both modes and tests share one definition.

import type { MatchCategory, PromptPurpose } from "@/lib/domain";

export const HANDOFF_KEY = "promptea:handoff";

export type HandoffPayload = {
  prompt: string;
  target: string;
  modelId: string;
  purpose: PromptPurpose;
};

/** Detected matcher category → analyzer purpose for the handoff prefill. */
export function purposeForCategory(category: MatchCategory | undefined): PromptPurpose {
  switch (category) {
    case "coding":
    case "codingAgent":
      return "code";
    case "dataExtraction":
      return "data";
    case "imagePrompts":
      return "image";
    case "marketing":
      return "marketing";
    case "translation":
      return "translation";
    case "summarization":
      return "summarization";
    case "tutoring":
      return "study";
    default:
      return "text";
  }
}
