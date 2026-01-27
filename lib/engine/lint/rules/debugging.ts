import type { Lang, Impact, Severity, FindingId, RecommendationId, OutputFormat } from "../types";
import { hasEnvironmentHints, hasErrorSnippet, hasNumberedSteps, isDebugLike } from "./utils";

type AddFinding = (id: FindingId, severity: Severity) => void;
type AddReco = (id: RecommendationId, impact: Impact) => void;

export function applyDebuggingRules(opts: {
  prompt: string;
  lang: Lang;
  taskType?: any;
  outputFormat?: OutputFormat | null;
  addFinding: AddFinding;
  addReco: AddReco;
}) {
  const { prompt, lang, taskType, addFinding, addReco } = opts;

  if (!isDebugLike(taskType, prompt, lang)) return;

  // Falta error/stacktrace/logs
  if (!hasErrorSnippet(prompt)) {
    addFinding("missing_error_message", "high");
    addReco("add_error_message", "high");
  }

  // Falta repro steps
  if (!hasNumberedSteps(prompt) && !prompt.toLowerCase().includes("steps")) {
    addFinding("missing_repro_steps", "medium");
    addReco("add_repro_steps", "medium");
  }

  // Falta entorno
  if (!hasEnvironmentHints(prompt)) {
    addFinding("missing_environment", "medium");
    addReco("add_environment", "low");
  }
}
