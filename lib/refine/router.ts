// lib/refine/router.ts
//
// Complexity classification + refinement-strategy router.
//
// The engine selects a strategy from the PROMPT ITSELF (plus the detected
// task type), not just the broad purpose the user clicked. The strategy
// decides how much structure the refined prompt receives: a short WhatsApp
// message must not get the same scaffolding as a repository migration plan.

import type { Complexity, Lang, PromptPurpose, RefinementStrategy, TaskType } from "@/lib/domain";
import { readsAsPortuguese } from "./language";

export type RoutingInput = {
  prompt: string;
  taskType: TaskType;
  purpose: PromptPurpose;
  attachmentsCount?: number;
  /** v1.8.2: interface language; lets a short Portuguese prompt be read as Portuguese. */
  lang?: Lang;
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
// v1.8.0: a debugging request needs an explicit agent/repo signal to be an
// agent task — "npm run dev" in reproduction steps is not one.
const REPO_AGENT_STRONG =
  /\b(repo(sitor(y|io))?|branch|rama|pull request|PR\b|merge|commit|checkout|claude code|codex|copilot|agente?)\b/i;
const CODE_TASKS = new Set<TaskType>(["coding", "debugging", "refactor"]);
const JSON_SCHEMA =
  /\b(json|schema|campos|fields?|extract|extra[eé]|parse|csv|tabla|table|columns?|columnas?|null)\b/i;
// v1.6.0: content-based image routing requires GENERATION intent. A prompt
// that merely mentions an image ("describe this photo", "analizá esta
// captura") is a vision/analysis task and must never receive an art-directed
// image prompt. Explicit image purpose still routes directly.
const IMAGE_MEDIUM_WORDS =
  "image|images|picture|photo|photograph|illustration|poster|logo|icon|wallpaper|render|artwork|drawing|painting|imagen|im[aá]genes|foto|fotograf[ií]a|ilustraci[oó]n|p[oó]ster|logotipo|[ií]cono|fondo de pantalla|dibujo|pintura";
const IMAGE_GEN_INTENT = new RegExp(
  [
    // Accented verb endings ("generá", "dibujá") are not JS word characters,
    // so explicit letter lookarounds replace \b around the verb.
    `(?<![\\wáéíóúñ])(generate|create|make|draw|design|render|paint|illustrate|produce|imagine|gener[aá](r|me)?|gen[eé]rame|cre[aá](r|me)?|cr[eé]ame|hac[eé](r|me)?|h[aá]zme|haz|dibuj[aá](r|me)?|dib[uú]jame|dise[nñ][aá](r|me)?|pint[aá](r|me)?)(?![\\wáéíóúñ])[^.\\n]{0,40}(?<![\\wáéíóúñ])(${IMAGE_MEDIUM_WORDS})(?![\\wáéíóúñ])`,
    `\\b(midjourney|dall[- ]?e|stable diffusion|sdxl|nano banana|gpt[- ]?image|flux|ideogram|firefly)\\b`,
    `\\b(aspect ratio|relaci[oó]n de aspecto|--ar\\s)`,
    `\\b(photorealistic|fotorrealista)\\b`,
    `^(?:(?:an?|the)\\s+)?(?:[\\w'’-]+\\s+){0,3}(image|picture|photo|photograph|illustration|render|painting|drawing|poster|portrait)\\s+of\\b`,
    `^(?:(?:una?|la|el)\\s+)?(imagen|foto|fotograf[ií]a|ilustraci[oó]n|render|pintura|dibujo|p[oó]ster|retrato)\\s+(?:[\\wáéíóúñü'’-]+\\s+){0,2}de\\b`,
  ].join("|"),
  "i"
);
const IMAGE_ANALYSIS =
  /\b(analy[sz]e|describe|explain|what('?s| is) in|identify|read|transcribe|extract|caption|ocr|analiz[aá]|describ[ií]|explic[aá]|qu[eé] (hay|muestra|aparece)|le[eé]|transcrib[ií]|extra[eé])\b[^.\n]{0,40}\b(image|photo|picture|screenshot|imagen|foto|captura)\b|\b(this|attached|the following|esta|adjunt[ao])\s+(image|photo|picture|screenshot|imagen|foto|captura)\b/i;

// v1.8.2 — the same routing signals written in Portuguese. Consulted only when
// the prompt reads as Portuguese (readsAsPortuguese), so Spanish and English
// prompts route exactly as in v1.8.1.
const PT_EDGE_L = "(?<![\\p{L}\\p{N}_])";
const PT_EDGE_R = "(?![\\p{L}\\p{N}_])";
const PT_IMAGE_MEDIUM =
  "imagem|imagens|foto|fotos|fotografia|ilustra[çc][ãa]o|p[ôo]ster|cartaz|logo|logotipo|[íi]cone|papel de parede|desenho|pintura|arte|render|thumbnail|capa";
const PT_IMAGE_GEN_INTENT = new RegExp(
  [
    `${PT_EDGE_L}(gere|gerar|gera|crie|criar|cria|fa[çc]a|fazer|faz|desenhe|desenhar|pinte|pintar|ilustre|ilustrar|produza|produzir|imagine|renderize)${PT_EDGE_R}[^.\\n]{0,40}${PT_EDGE_L}(${PT_IMAGE_MEDIUM})${PT_EDGE_R}`,
    `${PT_EDGE_L}(propor[çc][ãa]o (?:de )?\\d{1,2}:\\d{1,2}|fotorrealista)${PT_EDGE_R}`,
    `^(?:(?:uma?|a|o)\\s+)?(imagem|foto|fotografia|ilustra[çc][ãa]o|render|pintura|desenho|p[ôo]ster|retrato)\\s+(?:[\\p{L}'’-]+\\s+){0,2}de${PT_EDGE_R}`,
  ].join("|"),
  "iu",
);
const PT_IMAGE_ANALYSIS = new RegExp(
  `${PT_EDGE_L}(analise|analisar|descreva|descrever|explique|explicar|o que (?:h[áa]|tem|aparece|mostra)|leia|ler|transcreva|transcrever|extraia|extrair|identifique|identificar)${PT_EDGE_R}[^.\\n]{0,40}${PT_EDGE_L}(imagem|foto|fotografia|captura|print|screenshot)${PT_EDGE_R}|${PT_EDGE_L}(esta|essa|nesta|nessa|anexa|em anexo|a seguinte)\\s+(imagem|foto|fotografia|captura)${PT_EDGE_R}`,
  "iu",
);
const PT_FRONTEND_BUILD = new RegExp(
  `${PT_EDGE_L}(crie|criar|construa|construir|desenvolva|desenvolver|implemente|implementar|programe|programar|fa[çc]a|fazer|monte|montar|desenhe|desenhar|codifique)${PT_EDGE_R}[^.\\n]{0,40}${PT_EDGE_L}(landing page|landing|site|website|p[áa]gina web|p[áa]gina inicial|aplicativo web|web app|interface|dashboard|painel|portf[óo]lio|componente|formul[áa]rio|html|css)${PT_EDGE_R}`,
  "iu",
);
const PT_BRAINSTORM = new RegExp(`${PT_EDGE_L}(ideias?|brainstorm|op[çc][õo]es|alternativas?|nomes?|t[íi]tulos?|sugest[õo]es|sugest[ãa]o)${PT_EDGE_R}`, "iu");
const PT_PLANNING = new RegExp(`${PT_EDGE_L}(plano|planos|roadmap|cronograma|marcos|passos|etapas|checklist|estrat[ée]gia)${PT_EDGE_R}`, "iu");
const PT_LONG_FORM = new RegExp(`${PT_EDGE_L}(artigo|ensaio|blog|cap[íi]tulo|roteiro|newsletter|relat[óo]rio|documenta[çc][ãa]o)${PT_EDGE_R}`, "iu");
const PT_REPO_AGENT = new RegExp(`${PT_EDGE_L}(reposit[óo]rio|migra[çc][ãa]o de reposit[óo]rio|su[íi]te de testes|agente)${PT_EDGE_R}`, "iu");
const PT_JSON_SCHEMA = new RegExp(`${PT_EDGE_L}(json|schema|esquema|campos|extraia|extrair|csv|tabela|colunas?|null)${PT_EDGE_R}`, "iu");

/** True when the text asks for an image to be GENERATED (not analyzed). */
export function isImageGenerationRequest(text: string, lang?: Lang): boolean {
  const src = String(text ?? "");
  if (IMAGE_GEN_INTENT.test(src) && !IMAGE_ANALYSIS.test(src)) return true;
  return readsAsPortuguese(src, lang ?? "en") && PT_IMAGE_GEN_INTENT.test(src) && !PT_IMAGE_ANALYSIS.test(src) && !IMAGE_ANALYSIS.test(src);
}

// Building a website/UI is implementation work even when the classifier saw
// "landing" and guessed marketing copy.
const FRONTEND_BUILD =
  /(?<![\wáéíóúñ])(build|code|develop|implement|create|make|design|program|arm[aá]|armar|cre[aá]|crear|dise[nñ][aá]|dise[nñ]ar|desarroll[aá]|desarrollar|program[aá]|programar|maquet[aá]|maquetar|hac[eé]|hacer)(?![\wáéíóúñ])[^.\n]{0,40}(?<![\wáéíóúñ])(landing page|website|web site|web app|sitio web|p[aá]gina web|homepage|home page|frontend|front-end|user interface|interfaz|dashboard|portfolio|portafolio|react component|componente)(?![\wáéíóúñ])/i;
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
export function classifyComplexity(prompt: string, attachmentsCount = 0, lang?: Lang): Complexity {
  const text = String(prompt ?? "");
  const repoAgent = REPO_AGENT.test(text) || (readsAsPortuguese(text, lang ?? "en") && PT_REPO_AGENT.test(text));
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
  if (repoAgent) score++;

  // Repo/agent work is never "simple": commands, branches, and validation
  // steps always deserve structure even when phrased in one sentence.
  if (repoAgent) return score >= 3 ? "complex" : "moderate";

  if (score <= 1 && words <= 60) return "simple";
  if (score >= 3) return "complex";
  return "moderate";
}

/** Pick the refinement strategy from prompt content + detected task type. */
export function selectStrategy(input: RoutingInput): RoutingDecision {
  const text = String(input.prompt ?? "");
  const pt = readsAsPortuguese(text, input.lang ?? "en");
  const complexity = classifyComplexity(text, input.attachmentsCount ?? 0, input.lang);
  const signals: string[] = [`task:${input.taskType}`, `purpose:${input.purpose}`, `complexity:${complexity}`];

  const pick = (strategy: RefinementStrategy, signal: string): RoutingDecision => {
    signals.push(signal);
    return { strategy, complexity, signals };
  };

  // Content-driven overrides first: the prompt knows better than the dropdown.
  const agentEligible =
    input.taskType === "debugging"
      ? REPO_AGENT_STRONG.test(text) || (pt && PT_REPO_AGENT.test(text))
      : input.taskType === "coding" || input.taskType === "refactor" || input.taskType === "planning" || CODE_FENCE.test(text);
  if ((REPO_AGENT.test(text) || (pt && PT_REPO_AGENT.test(text))) && agentEligible) {
    return pick("agent_workflow", "match:repo_agent");
  }
  // v1.8.0: "returns 500 when I POST JSON" is a bug report, not an extraction
  // task — content-based JSON routing skips code tasks.
  const jsonByContent = !CODE_TASKS.has(input.taskType) && (JSON_SCHEMA.test(text) || (pt && PT_JSON_SCHEMA.test(text))) && /\bjson\b/i.test(text);
  if (input.purpose === "data" || input.taskType === "data_extraction" || jsonByContent) {
    return pick("data_schema", "match:json_schema");
  }
  if (input.purpose === "image" || input.taskType === "image" || isImageGenerationRequest(text, input.lang)) {
    return pick("image_generation", "match:image");
  }
  if ((input.purpose === "text" || input.purpose === "code") && (FRONTEND_BUILD.test(text) || (pt && PT_FRONTEND_BUILD.test(text)))) {
    return pick("coding_implementation", "match:frontend_build");
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
  // v1.8.0: a detected planning task is planning at any complexity (the
  // simple light path keeps it natural anyway); the bare keyword still needs
  // real multi-step intent.
  if (input.taskType === "planning") return pick("planning_execution", "task:planning");
  if ((PLANNING.test(text) || (pt && PT_PLANNING.test(text))) && complexity !== "simple") return pick("planning_execution", "match:planning");
  if ((BRAINSTORM.test(text) || (pt && PT_BRAINSTORM.test(text))) && complexity === "simple") return pick("brainstorming", "match:brainstorm");
  if (LONG_FORM.test(text) || (pt && PT_LONG_FORM.test(text)) || (input.taskType === "writing" && complexity !== "simple")) {
    return pick("long_form_writing", "match:long_form");
  }

  // Short conversational asks get a light touch.
  if (complexity === "simple") return pick("message_polish", "match:simple_default");

  return pick("general", "match:general_default");
}
