import type {
  Lang,
  LintResult,
  LintFinding,
  LintRecommendation,
  Impact,
  Severity,
  OutputFormat,
} from "./types";
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

function detectGoal(low: string, taskType?: string) {
  const generic =
    /objetivo\s*:/.test(low) ||
    /goal\s*:/.test(low) ||
    /\bquiero\b/.test(low) ||
    /\bi want\b/.test(low) ||
    /\bnecesito\b/.test(low) ||
    /\bi need\b/.test(low) ||
    /\bhaceme\b/.test(low) ||
    /\bmake\b/.test(low);

  if (generic) return true;

  switch (String(taskType)) {
    case "translation":
      return /(translate|translation|traducí|traducime|traducir|traduce|traducción)/.test(low);

    case "summarization":
      return /(summary|summarize|summarise|tl;dr|resumen|resumí|resumime|resumir)/.test(low);

    case "study":
      return /(explain|teach|help me learn|explicá|explica|enseñame|ensename|aprender)/.test(low);

    case "marketing":
      return /(marketing|copy|ads|landing|cta|anuncio|campaña|campana)/.test(low);

    case "coding":
    case "debugging":
    case "refactor":
      return /(fix|debug|refactor|implement|build|arreglá|arregla|debuggeá|implementá|codigo|código)/.test(low);

    case "data_extraction":
      return /(extract|parse|schema|json|extrae|extraé|parsea|parseá|campos)/.test(low);

    default:
      return false;
  }
}

export function lintPrompt(
  prompt: string,
  lang: Lang,
  taskType?: any,
  opts?: { attachmentsPresent?: boolean }
): LintResult {
  const p = (prompt ?? "").trim();
  const low = p.toLowerCase();
  const task = String(taskType ?? "");
  const attachmentsPresent = !!opts?.attachmentsPresent;

  const findings: LintFinding[] = [];
  const recommendations: LintRecommendation[] = [];
  const w = wordsCount(p);

  if (w <= 3 && !attachmentsPresent) {
    pushFinding(findings, "too_short", "medium", lang);
  }

  const hasGoal = detectGoal(low, task);

  if (!hasGoal) {
    pushFinding(findings, "missing_goal", "high", lang);
    pushReco(recommendations, "add_goal", "high", lang);
  }

  const outputFormat: OutputFormat | null | undefined = detectOutputFormat(p, lang);

  if (!outputFormat) {
    pushFinding(findings, "missing_output_format", "high", lang);
    pushReco(recommendations, "define_output_format", "high", lang);
  }

  const hasGenericConstraints =
    /restric/.test(low) ||
    /constraints?/.test(low) ||
    includesAny(low, ["máx", "max ", "sin ", "avoid", "tone", "tono", "largo", "length", "focus", "foco"]);

  const hasSuccess =
    /criterio(s)? de éxito/.test(low) ||
    /success criteria/.test(low) ||
    /que incluya/.test(low) ||
    /must include/.test(low);

  if (!hasSuccess && task !== "summarization" && task !== "translation") {
    pushReco(recommendations, "add_success_criteria", "medium", lang);
  }

  const contextCues =
    lang === "es"
      ? ["contexto", "escenario", "audiencia", "para quién", "para quien", "para qué", "para que", "uso", "entrada", "inputs"]
      : ["context", "scenario", "audience", "intended use", "input", "inputs"];

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
      "attached",
      "adjunto",
      "dataset",
      "csv",
      "código",
      "code",
      "source text",
      "original text",
      "article:",
      "document:",
    ]);

  const looksContextPoor = !attachmentsPresent && !hasContextCues && !hasWorkMaterial && w >= 4 && w <= 120;
  if (looksContextPoor && task !== "summarization" && task !== "translation") {
    pushFinding(findings, "missing_context", "high", lang);
    pushReco(recommendations, "add_context", "high", lang);
  }

  const addFinding = (id: any, severity: any) => pushFinding(findings, id, severity, lang);
  const addReco = (id: any, impact: any) => pushReco(recommendations, id, impact, lang);

  if (task === "summarization") {
    const hasSourceMaterial =
      attachmentsPresent ||
      includesAny(low, ["texto:", "text:", "article:", "artículo:", "articulo:", "document:", "documento:", "archivo", "file"]) ||
      /```/.test(p) ||
      w > 40;

    const hasSummaryLength = includesAny(low, [
      "brief",
      "short",
      "concise",
      "long",
      "detailed",
      "bullets",
      "paragraph",
      "sections",
      "breve",
      "corto",
      "largo",
      "detallado",
      "viñetas",
      "vinyetas",
      "párrafo",
      "parrafo",
      "secciones",
    ]);

    const hasSummaryScope = includesAny(low, [
      "focus",
      "focused",
      "key ideas",
      "main ideas",
      "by section",
      "by topic",
      "foco",
      "enfocado",
      "ideas clave",
      "por secciones",
      "por temas",
      "lo más importante",
    ]);

    if (!hasSourceMaterial) {
      addFinding("missing_input_data", "high");
      addReco("add_input_data", "high");
    }
    if (!hasSummaryLength) {
      addFinding("missing_summary_length", "medium");
      addReco("define_summary_length", "medium");
    }
    if (!hasSummaryScope) {
      addFinding("missing_summary_scope", "medium");
      addReco("define_summary_scope", "medium");
    }
  } else if (task === "translation") {
    const hasSourceText =
      attachmentsPresent ||
      includesAny(low, ["texto:", "text:", "source text", "original text", "archivo", "file"]) ||
      /```/.test(p) ||
      w > 30;

    const hasTargetLanguage = includesAny(low, [
      "english",
      "spanish",
      "español",
      "espanol",
      "inglés",
      "ingles",
      "french",
      "francés",
      "frances",
      "portuguese",
      "portugués",
      "portugues",
      "target language",
      "idioma objetivo",
      "into ",
      "al ",
    ]);

    const hasRegister = includesAny(low, [
      "formal",
      "neutral",
      "natural",
      "literal",
      "casual",
      "formal",
      "neutro",
      "natural",
      "literal",
      "casual",
    ]);

    if (!hasSourceText) {
      addFinding("missing_input_data", "high");
      addReco("add_input_data", "high");
    }
    if (!hasTargetLanguage) {
      addFinding("missing_translation_target", "high");
      addReco("define_translation_target", "high");
    }
    if (!hasRegister) {
      addFinding("missing_translation_register", "low");
      addReco("define_translation_register", "medium");
    }
  } else if (task === "study") {
    const hasStudyLevel = includesAny(low, [
      "for beginners",
      "high school",
      "college",
      "university",
      "basic",
      "intermediate",
      "advanced",
      "principiante",
      "secundario",
      "universitario",
      "básico",
      "basico",
      "intermedio",
      "avanzado",
    ]);

    if (!hasStudyLevel) {
      addFinding("missing_study_level", "medium");
      addReco("define_study_level", "medium");
    }
  } else if (task === "marketing") {
    const hasAudience = includesAny(low, [
      "audience",
      "persona",
      "target audience",
      "customer",
      "buyer",
      "audiencia",
      "cliente ideal",
      "para founders",
      "para marketers",
      "para dueños",
    ]);

    const hasCTA = includesAny(low, [
      "cta",
      "call to action",
      "sign up",
      "buy now",
      "book a demo",
      "register",
      "comprar",
      "registrarse",
      "agendar demo",
      "suscribirse",
    ]);

    if (!hasAudience) {
      addFinding("missing_marketing_audience", "high");
      addReco("define_marketing_audience", "high");
    }
    if (!hasCTA) {
      addFinding("missing_marketing_cta", "medium");
      addReco("define_marketing_cta", "medium");
    }
  } else {
    if (!hasGenericConstraints) {
      addFinding("missing_constraints", "medium");
      addReco("add_constraints", "medium");
    }
  }

  applyDataExtractionRules({ prompt: p, lang, taskType, outputFormat, addFinding, addReco });
  applyDebuggingRules({ prompt: p, lang, taskType, outputFormat, addFinding, addReco });

  applyContradictions({ prompt: p, lang, addFinding });
  applyInjectionRules({ prompt: p, lang, addFinding });

  const uniqFindings = Array.from(new Map(findings.map((f) => [f.id, f])).values());
  const uniqRecos = Array.from(new Map(recommendations.map((r) => [r.id, r])).values());

  return {
    outputFormat,
    findings: uniqFindings,
    recommendations: uniqRecos,
  };
}