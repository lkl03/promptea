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
import { CODE_CONSTRAINT_RE, CODE_DELIVERABLE_RE, hasGoalSignal, hasImplicitOutputSpec, IMAGE_NEGATIVE_RE } from "../signals";
import {
  isPt,
  PT_CODE_CONSTRAINT,
  PT_CODE_DELIVERABLE,
  PT_CONTEXT_CUES,
  PT_GENERIC_CONSTRAINTS,
  PT_IMAGE_NEGATIVE,
  PT_INLINE_SOURCE,
  PT_MARKETING_AUDIENCE,
  PT_MARKETING_CTA,
  PT_REGISTER,
  PT_SOURCE_LABELS,
  PT_STUDY_LEVEL,
  PT_SUCCESS,
  PT_SUMMARY_LENGTH,
  PT_SUMMARY_SCOPE,
  PT_TARGET_LANGUAGE,
  PT_TASK_GOAL,
  PT_WORK_MATERIAL,
} from "../pt";

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

// v1.8.0: quoted source text ("…") and inline "esto: …" / "this: …" payloads
// are source material even when short.
const QUOTED_SOURCE = /["“«][^"”»]{8,}["”»]/;
const INLINE_SOURCE = /(?:^|\s)(esto|this|lo siguiente|the following|siguiente texto|following text)\s*:\s*\S/i;
const STUDY_LEVEL_EXTRA =
  /\b(first|second|third|fourth|final)[- ]year\b|\b(primer|segundo|tercer|cuarto|[uú]ltimo) a[nñ]o\b|\bgrade \d+|\b\d+(st|nd|rd|th) grade\b|\bundergrad|\bgraduate\b|\bposgrado\b|\bmaestr[ií]a\b|\bphd\b/i;

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
  taskType?: string,
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

  // v1.8.0: the same detector the scorer uses (they used to disagree).
  // v1.8.2: read with the Portuguese vocabulary too when the prompt reads as Portuguese.
  const pt = isPt(p, lang);
  const hasGoal = hasGoalSignal(p, task, lang) || detectGoal(low, task) || (pt && (PT_TASK_GOAL[task]?.test(p) ?? false));
  const isImage = task === "image";

  if (!hasGoal) {
    pushFinding(findings, "missing_goal", "high", lang);
    pushReco(recommendations, "add_goal", "high", lang);
  }

  const outputFormat: OutputFormat | null | undefined = detectOutputFormat(p, lang);

  // v1.8.0: "3 headlines, max 30 characters" IS an output spec, and an
  // image's output is the image itself (medium/aspect are scored instead).
  const codeDeliverable = (task === "coding" || task === "refactor") && (CODE_DELIVERABLE_RE.test(p) || (pt && PT_CODE_DELIVERABLE.test(p)));
  if (!outputFormat && !isImage && !codeDeliverable && !hasImplicitOutputSpec(p, lang)) {
    pushFinding(findings, "missing_output_format", "high", lang);
    pushReco(recommendations, "define_output_format", "high", lang);
  }

  const hasGenericConstraints =
    /restric/.test(low) ||
    /constraints?/.test(low) ||
    includesAny(low, ["máx", "max ", "sin ", "avoid", "tone", "tono", "largo", "length", "focus", "foco"]) ||
    (pt && includesAny(low, PT_GENERIC_CONSTRAINTS));

  const hasSuccess =
    /criterio(s)? de éxito/.test(low) ||
    /success criteria/.test(low) ||
    /que incluya/.test(low) ||
    /must include/.test(low) ||
    (pt && PT_SUCCESS.test(p));

  if (!hasSuccess && task !== "summarization" && task !== "translation") {
    pushReco(recommendations, "add_success_criteria", "medium", lang);
  }

  const contextCues = pt
    ? PT_CONTEXT_CUES
    : lang === "es"
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
    ]) ||
    (pt && includesAny(low, PT_WORK_MATERIAL));

  // v1.8.0: a pinned stack ("Python 3.12 … con SQLAlchemy") IS technical context.
  const codeSpec = (task === "coding" || task === "refactor") && (CODE_CONSTRAINT_RE.test(p) || (pt && PT_CODE_CONSTRAINT.test(p)));
  const looksContextPoor = !isImage && !codeSpec && !attachmentsPresent && !hasContextCues && !hasWorkMaterial && w >= 4 && w <= 120;
  if (looksContextPoor && task !== "summarization" && task !== "translation") {
    pushFinding(findings, "missing_context", "high", lang);
    pushReco(recommendations, "add_context", "high", lang);
  }

  const addFinding = (id: LintFinding["id"], severity: Severity) => pushFinding(findings, id, severity, lang);
  const addReco = (id: LintRecommendation["id"], impact: Impact) => pushReco(recommendations, id, impact, lang);

  if (task === "summarization") {
    const hasSourceMaterial =
      attachmentsPresent ||
      QUOTED_SOURCE.test(p) ||
      INLINE_SOURCE.test(p) ||
      includesAny(low, ["texto:", "text:", "article:", "artículo:", "articulo:", "document:", "documento:", "archivo", "file"]) ||
      (pt && (includesAny(low, PT_SOURCE_LABELS) || PT_INLINE_SOURCE.test(p))) ||
      /```/.test(p) ||
      w > 40;

    const hasSummaryLength = includesAny(low, [
      "brief",
      "short",
      "concise",
      "long",
      "detailed",
      "bullets",
      // v1.8.3 (engine 2.4.1): "five bullet points" is a length/shape, exactly like
      // "cinco viñetas" (es) and "cinco tópicos" (pt), which already counted.
      "bullet point",
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
    ]) || (pt && includesAny(low, PT_SUMMARY_LENGTH));

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
    ]) || (pt && includesAny(low, PT_SUMMARY_SCOPE));

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
      QUOTED_SOURCE.test(p) ||
      INLINE_SOURCE.test(p) ||
      includesAny(low, ["texto:", "text:", "source text", "original text", "archivo", "file"]) ||
      (pt && (includesAny(low, PT_SOURCE_LABELS) || PT_INLINE_SOURCE.test(p))) ||
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
    ]) || (pt && includesAny(low, PT_TARGET_LANGUAGE));

    const hasRegister = includesAny(low, [
      "formal",
      "neutral",
      "natural",
      "literal",
      "casual",
      "professional",
      "friendly",
      "colloquial",
      "polite",
      "profesional",
      "amigable",
      "cercano",
      "informal",
      "coloquial",
      "respetuoso",
      "formal",
      "neutro",
      "natural",
      "literal",
      "casual",
    ]) || (pt && includesAny(low, PT_REGISTER));

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
    ]) || STUDY_LEVEL_EXTRA.test(p) || (pt && includesAny(low, PT_STUDY_LEVEL));

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
      // v1.8.3 (engine 2.4.1): "para clientes recurrentes" names the audience, as
      // "customers" (en, matched by "customer") and "clientes" (pt) already did.
      "clientes",
      "para founders",
      "para marketers",
      "para dueños",
    ]) || (pt && includesAny(low, PT_MARKETING_AUDIENCE));

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
    ]) || (pt && includesAny(low, PT_MARKETING_CTA));

    if (!hasAudience) {
      addFinding("missing_marketing_audience", "high");
      addReco("define_marketing_audience", "high");
    }
    if (!hasCTA) {
      addFinding("missing_marketing_cta", "medium");
      addReco("define_marketing_cta", "medium");
    }
  } else {
    if (!hasGenericConstraints && !codeSpec && !(isImage && (IMAGE_NEGATIVE_RE.test(p) || (pt && PT_IMAGE_NEGATIVE.test(p))))) {
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