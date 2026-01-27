import type { Lang, LintResult, LintFinding, LintRecommendation, Impact, Severity, OutputFormat } from "./types";
import { detectOutputFormat } from "./detectOutputFormat";
import { findingText, recoText } from "./catalog";

import { applyDebuggingRules } from "./rules/debugging";
import { applyDataExtractionRules } from "./rules/dataExtraction";
import { applyContradictions } from "./rules/contradictions";
import { applyInjectionRules } from "./rules/injections";
import { includesAny } from "./rules/utils";

function wordsCount(s: string) {
  return (s ?? "").trim().split(/\s+/).filter(Boolean).length;
}

function pushFinding(findings: LintFinding[], id: LintFinding["id"], severity: Severity, lang: Lang) {
  if (findings.some((f) => f.id === id)) return;
  const t = findingText(id, lang);
  findings.push({ id, severity, ...t });
}

function pushReco(recos: LintRecommendation[], id: LintRecommendation["id"], impact: Impact, lang: Lang) {
  if (recos.some((r) => r.id === id)) return;
  const t = recoText(id, lang);
  recos.push({ id, impact, ...t });
}

/**
 * 6B: ahora acepta taskType (viene de classifyTask)
 * - No afecta scoring.
 * - Solo agrega findings/recos más precisos.
 */
export function lintPrompt(prompt: string, lang: Lang, taskType?: any): LintResult {
  const p = (prompt ?? "").trim();
  const low = p.toLowerCase();

  const findings: LintFinding[] = [];
  const recommendations: LintRecommendation[] = [];

  const w = wordsCount(p);

  // -------- base rules (6A) --------
  if (w <= 3) {
    pushFinding(findings, "too_short", "medium", lang);
  }

  const hasGoal =
    /objetivo\s*:/.test(low) ||
    /goal\s*:/.test(low) ||
    /\bquiero\b/.test(low) ||
    /\bi want\b/.test(low) ||
    /\bnecesito\b/.test(low) ||
    /\bi need\b/.test(low);

  if (!hasGoal) {
    pushFinding(findings, "missing_goal", "high", lang);
    pushReco(recommendations, "add_goal", "high", lang);
  }

  const outputFormat: OutputFormat | null | undefined = detectOutputFormat(p, lang);

  if (!outputFormat) {
    pushFinding(findings, "missing_output_format", "high", lang);
    pushReco(recommendations, "define_output_format", "high", lang);
  }

  const hasConstraints =
    /restric/.test(low) ||
    /constraints?/.test(low) ||
    includesAny(low, ["máx", "max ", "sin ", "avoid", "no ", "tono", "tone", "largo", "length"]);

  if (!hasConstraints) {
    pushFinding(findings, "missing_constraints", "medium", lang);
    pushReco(recommendations, "add_constraints", "medium", lang);
  }

  const hasSuccess =
    /criterio(s)? de éxito/.test(low) ||
    /success criteria/.test(low) ||
    /que incluya/.test(low) ||
    /must include/.test(low);

  if (!hasSuccess) {
    pushReco(recommendations, "add_success_criteria", "medium", lang);
  }

  // Missing context (general)
  const contextCues =
    lang === "es"
      ? ["contexto", "escenario", "audiencia", "para quién", "para quien", "para qué", "para que", "uso", "datos disponibles", "entrada", "inputs"]
      : ["context", "scenario", "audience", "for who", "intended use", "available info", "input", "inputs"];

  const hasContextCues = includesAny(low, contextCues);

  const hasWorkMaterial =
    /```/.test(p) ||
    includesAny(low, [
      "texto:",
      "text:",
      "logs",
      "log",
      "stacktrace",
      "traceback",
      "error:",
      "archivo",
      "file",
      "dataset",
      "csv",
      "código",
      "code",
    ]);

  const looksContextPoor = !hasContextCues && !hasWorkMaterial && w >= 4 && w <= 120;
  if (looksContextPoor) {
    pushFinding(findings, "missing_context", "high", lang);
    pushReco(recommendations, "add_context", "high", lang);
  }

  // -------- 6B task-aware rules --------
  const addFinding = (id: any, severity: any) => pushFinding(findings, id, severity, lang);
  const addReco = (id: any, impact: any) => pushReco(recommendations, id, impact, lang);

  applyDataExtractionRules({ prompt: p, lang, taskType, outputFormat, addFinding, addReco });
  applyDebuggingRules({ prompt: p, lang, taskType, outputFormat, addFinding, addReco });

  // -------- 6B contradictions + injection --------
  applyContradictions({ prompt: p, lang, addFinding });
  applyInjectionRules({ prompt: p, lang, addFinding });

  // ✅ final dedupe (seguro extra)
  const uniqFindings = Array.from(new Map(findings.map((f) => [f.id, f])).values());
  const uniqRecos = Array.from(new Map(recommendations.map((r) => [r.id, r])).values());

  return {
    outputFormat,
    findings: uniqFindings,
    recommendations: uniqRecos,
  };
}



