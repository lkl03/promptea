// lib/refine/router.ts
//
// Complexity classification + refinement-strategy router.
//
// The engine selects a strategy from the PROMPT ITSELF (plus the detected
// task type), not just the broad purpose the user clicked. The strategy
// decides how much structure the refined prompt receives: a short WhatsApp
// message must not get the same scaffolding as a repository migration plan.

import type { Complexity, PromptPurpose, RefinementStrategy, TaskType } from "@/lib/domain";

export type RoutingInput = {
  prompt: string;
  taskType: TaskType;
  purpose: PromptPurpose;
  attachmentsCount?: number;
};

export type RoutingDecision = {
  strategy: RefinementStrategy;
  complexity: Complexity;
  /** Signals that drove the decision — safe for diagnostics (no user text). */
  signals: string[];
};

const CODE_FENCE = /```|~~~/;
const REPO_AGENT =
  /\b(repo(sitor(y|io))?|branch|rama|pull request|PR\b|merge|commit|checkout|npm (run|ci|install)|pnpm|yarn|git\s+\w+|CI\b|pipeline|deploy|lint|test suite|migraci[oó]n de repo|claude code|codex|copilot|agente?)\b/i;
const JSON_SCHEMA =
  /\b(json|schema|campos|fields?|extract|extra[eé]|parse|csv|tabla|table|columns?|columnas?|null)\b/i;
const IMAGE_GEN =
  /\b(imagen|image|foto|photo|illustration|ilustraci[oó]n|render|midjourney|dall[- ]?e|stable diffusion|aspect ratio|relaci[oó]n de aspecto|estilo visual)\b/i;
const BRAINSTORM = /\b(ideas?|brainstorm|opciones|alternativas?|nombres?|t[ií]tulos?|sugerencias?|suggest)\b/i;
const PLANNING = /\b(plan|roadmap|cronograma|timeline|milestones?|pasos|steps|checklist|estrategia|strategy)\b/i;
const LONG_FORM =
  /\b(art[ií]culo|article|ensayo|essay|blog|post largo|cap[ií]tulo|chapter|gui[oó]n|script|newsletter|informe|report|documentaci[oó]n|documentation)\b/i;
const MULTI_REQ = /(\n\s*[-*•]\s+|\n\s*\d+[.)]\s+)/;

function wordCount(text: string): number {
  const t = text.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

/** Classify how much structure the prompt's task actually needs. */
export function classifyComplexity(prompt: string, attachmentsCount = 0): Complexity {
  const text = String(prompt ?? "");
  const words = wordCount(text);
  const bullets = (text.match(MULTI_REQ) ?? []).length;
  const hasCode = CODE_FENCE.test(text) || /\bfunction\b|\bconst\b|=>|\bclass\s+\w+/.test(text);
  const sections = (text.match(/\n{2,}/g) ?? []).length;

  let score = 0;
  if (words > 60) score++;
  if (words > 180) score++;
  if (bullets >= 2) score++;
  if (hasCode) score++;
  if (sections >= 3) score++;
  if (attachmentsCount > 0) score++;
  if (REPO_AGENT.test(text)) score++;

  // Repo/agent work is never "simple": commands, branches, and validation
  // steps always deserve structure even when phrased in one sentence.
  if (REPO_AGENT.test(text)) return score >= 3 ? "complex" : "moderate";

  if (score <= 1 && words <= 60) return "simple";
  if (score >= 3) return "complex";
  return "moderate";
}

/** Pick the refinement strategy from prompt content + detected task type. */
export function selectStrategy(input: RoutingInput): RoutingDecision {
  const text = String(input.prompt ?? "");
  const complexity = classifyComplexity(text, input.attachmentsCount ?? 0);
  const signals: string[] = [`task:${input.taskType}`, `purpose:${input.purpose}`, `complexity:${complexity}`];

  const pick = (strategy: RefinementStrategy, signal: string): RoutingDecision => {
    signals.push(signal);
    return { strategy, complexity, signals };
  };

  // Content-driven overrides first: the prompt knows better than the dropdown.
  if (REPO_AGENT.test(text) && (input.taskType === "coding" || input.taskType === "refactor" || input.taskType === "planning" || CODE_FENCE.test(text))) {
    return pick("agent_workflow", "match:repo_agent");
  }
  if (input.purpose === "data" || input.taskType === "data_extraction" || (JSON_SCHEMA.test(text) && /\bjson\b/i.test(text))) {
    return pick("data_schema", "match:json_schema");
  }
  if (input.purpose === "image" || input.taskType === "image" || IMAGE_GEN.test(text)) {
    return pick("image_generation", "match:image");
  }
  if (input.taskType === "translation") return pick("translation", "task:translation");
  if (input.taskType === "summarization") return pick("summarization", "task:summarization");
  if (input.taskType === "debugging" || input.taskType === "refactor") {
    return pick("debugging_review", "task:debugging_review");
  }
  if (input.taskType === "coding") return pick("coding_implementation", "task:coding");
  if (input.taskType === "study") return pick("study_tutoring", "task:study");
  if (input.taskType === "marketing") return pick("marketing_copy", "task:marketing");
  if (input.taskType === "research") return pick("analysis_research", "task:research");
  if (input.taskType === "planning" || PLANNING.test(text)) {
    // Only treat as planning when there is real multi-step intent.
    if (complexity !== "simple") return pick("planning_execution", "match:planning");
  }
  if (BRAINSTORM.test(text) && complexity === "simple") return pick("brainstorming", "match:brainstorm");
  if (LONG_FORM.test(text) || (input.taskType === "writing" && complexity !== "simple")) {
    return pick("long_form_writing", "match:long_form");
  }

  // Short conversational asks get a light touch.
  if (complexity === "simple") return pick("message_polish", "match:simple_default");

  return pick("general", "match:general_default");
}
