import type { Lang, Impact, Severity, FindingId, RecommendationId, OutputFormat } from "../types";
import { hasInputDataForExtraction, hasStrongSchema, isExtractionLike, wantsJson } from "./utils";

type AddFinding = (id: FindingId, severity: Severity) => void;
type AddReco = (id: RecommendationId, impact: Impact) => void;

export function applyDataExtractionRules(opts: {
  prompt: string;
  lang: Lang;
  taskType?: any;
  outputFormat?: OutputFormat | null;
  addFinding: AddFinding;
  addReco: AddReco;
}) {
  const { prompt, lang, taskType, outputFormat, addFinding, addReco } = opts;

  if (!isExtractionLike(taskType, prompt, lang)) return;

  // Si no hay texto/datos a extraer
  if (!hasInputDataForExtraction(prompt)) {
    addFinding("missing_input_data", "high");
    addReco("add_input_data", "high");
  }

  // Si pide JSON pero no hay schema fuerte -> add_schema (dataset definition)
  if (wantsJson(outputFormat ?? null, prompt) && !hasStrongSchema(prompt)) {
    addFinding("missing_schema", "high");
    addReco("add_schema", "high");
  }
}
