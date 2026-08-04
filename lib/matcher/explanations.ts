// lib/matcher/explanations.ts
//
// Template-based bilingual explanations for matcher results. Deterministic:
// every sentence is assembled from detected signals, category evidence, and
// registry capability data — advice always cites something observed in the
// submitted prompt, never generic filler.

import type { InteractionProfile, Lang, MatchCategory, TargetAI } from "@/lib/domain";
import type { ModelEntry } from "@/lib/models";
import type { CategoryContribution, MatcherFeatures, ScoredModel } from "./types";

function t(lang: Lang, es: string, en: string): string {
  return lang === "es" ? es : en;
}

// ── Labels ──────────────────────────────────────────────────────────────────

const TARGET_PRODUCT: Record<TargetAI, string> = {
  gpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  grok: "Grok",
  kimi: "Kimi",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
};

const AGENT_PRODUCT: Partial<Record<TargetAI, string>> = {
  claude: "Claude Code",
  gpt: "Codex",
  gemini: "Gemini CLI",
};

export function productLabel(target: TargetAI, profile: InteractionProfile): string {
  if (profile === "codingAgent" && AGENT_PRODUCT[target]) return AGENT_PRODUCT[target]!;
  return TARGET_PRODUCT[target] ?? String(target).toUpperCase();
}

export const CATEGORY_LABEL: Record<MatchCategory, { es: string; en: string }> = {
  chat: { es: "conversación general", en: "general chat" },
  coding: { es: "trabajo con código", en: "code work" },
  codingAgent: { es: "tareas de agente sobre repositorios", en: "repository agent tasks" },
  research: { es: "investigación con información actual", en: "research with current information" },
  longContext: { es: "documentos y contexto largo", en: "long documents and context" },
  multimodal: { es: "contenido multimodal (imágenes, video)", en: "multimodal content (images, video)" },
  dataExtraction: { es: "extracción de datos estricta", en: "strict data extraction" },
  creativeWriting: { es: "escritura creativa", en: "creative writing" },
  marketing: { es: "copy de marketing", en: "marketing copy" },
  translation: { es: "traducción", en: "translation" },
  summarization: { es: "resumen de contenido", en: "summarization" },
  tutoring: { es: "estudio y tutoría", en: "study and tutoring" },
  imagePrompts: { es: "prompts para generar imágenes", en: "image-generation prompts" },
  complexReasoning: { es: "razonamiento complejo", en: "complex reasoning" },
  fastLightweight: { es: "tareas rápidas y livianas", en: "fast lightweight tasks" },
};

function categoryLabel(category: MatchCategory, lang: Lang): string {
  const entry = CATEGORY_LABEL[category];
  return lang === "es" ? entry.es : entry.en;
}

function topContributions(scored: ScoredModel, max = 3): CategoryContribution[] {
  return [...scored.contributions]
    .filter((c) => c.points > 0 && c.category !== "chat")
    .sort((a, b) => b.points - a.points)
    .slice(0, max);
}

// ── Reasons ─────────────────────────────────────────────────────────────────

export function buildReasons(
  lang: Lang,
  features: MatcherFeatures,
  scored: ScoredModel,
  entry: ModelEntry,
  profile: InteractionProfile
): string[] {
  const reasons: string[] = [];
  const tops = topContributions(scored);

  for (const c of tops.slice(0, 2)) {
    const signalNames = features.signals
      .filter((s) => s.categories.includes(c.category))
      .map((s) => s.label.toLowerCase())
      .slice(0, 2);
    const evidenceTxt = signalNames.length
      ? t(lang, ` (detectamos: ${signalNames.join(", ")})`, ` (detected: ${signalNames.join(", ")})`)
      : "";
    reasons.push(
      t(
        lang,
        `Tu prompt apunta a ${categoryLabel(c.category, lang)}${evidenceTxt}, y ${entry.label} está entre las mejores opciones para eso.`,
        `Your prompt targets ${categoryLabel(c.category, lang)}${evidenceTxt}, and ${entry.label} is among the strongest options for that.`
      )
    );
  }

  if (profile === "codingAgent") {
    reasons.push(
      t(
        lang,
        `Por las rutas, comandos o criterios de validación que incluye, conviene un agente de código que trabaje sobre el repo — no un chat común.`,
        `Given the paths, commands, or validation criteria it includes, a repository coding agent fits better than plain chat.`
      )
    );
  } else if (profile === "researchAssistant" && entry.capabilities?.nativeSearch) {
    reasons.push(
      t(
        lang,
        `Pide información actual o fuentes: ${entry.label} busca en la web y cita fuentes de forma nativa.`,
        `It asks for current information or sources: ${entry.label} searches the web and cites sources natively.`
      )
    );
  } else if (entry.capabilities?.latencyClass === "fast" && (features.evidence.fastLightweight ?? 0) > 0) {
    reasons.push(
      t(
        lang,
        `Es una tarea corta: ${entry.label} responde rápido y a bajo costo sin sacrificar calidad en pedidos simples.`,
        `It's a short task: ${entry.label} answers fast and cheaply without losing quality on simple requests.`
      )
    );
  }

  if (reasons.length < 2) {
    reasons.push(
      t(
        lang,
        `${entry.label} es un asistente general sólido y equilibrado para este tipo de pedido.`,
        `${entry.label} is a solid, balanced general assistant for this kind of request.`
      )
    );
  }
  if (reasons.length < 2) {
    reasons.push(
      t(
        lang,
        "Tu prompt no muestra señales especializadas (código, datos, búsqueda…), así que conviene un asistente conversacional versátil.",
        "Your prompt shows no specialized signals (code, data, search…), so a versatile conversational assistant is the safest fit."
      )
    );
  }

  return reasons.slice(0, 3);
}

// ── Trade-offs and "best at" for alternatives ───────────────────────────────

export function buildTradeoff(
  lang: Lang,
  alt: ScoredModel,
  altEntry: ModelEntry,
  primary: ScoredModel
): string {
  // Find the evidenced category where the alternative loses the most points
  // vs the primary — that's its concrete trade-off for THIS prompt.
  let worst: { category: MatchCategory; gap: number } | null = null;
  for (const c of alt.contributions) {
    const p = primary.contributions.find((pc) => pc.category === c.category);
    const gap = (p?.points ?? 0) - c.points;
    if (gap > 0 && (!worst || gap > worst.gap)) worst = { category: c.category, gap };
  }

  if (worst) {
    return t(
      lang,
      `Queda por detrás en ${categoryLabel(worst.category, lang)} para este prompt.`,
      `It falls behind on ${categoryLabel(worst.category, lang)} for this prompt.`
    );
  }
  if (altEntry.capabilities?.latencyClass === "slow") {
    return t(lang, "Suele ser más lento y costoso.", "Tends to be slower and more expensive.");
  }
  return t(
    lang,
    "Diferencia mínima: cualquiera de los dos funciona bien acá.",
    "Minimal difference: either works well here."
  );
}

export function buildBestAt(lang: Lang, alt: ScoredModel, altEntry: ModelEntry): string {
  const caps = altEntry.capabilities;
  const tops = topContributions(alt, 1);
  if (tops.length && tops[0].fit >= 2) {
    return t(
      lang,
      `Fuerte en ${categoryLabel(tops[0].category, lang)}.`,
      `Strong at ${categoryLabel(tops[0].category, lang)}.`
    );
  }
  if (caps?.latencyClass === "fast") {
    return t(lang, "Rápido y económico.", "Fast and inexpensive.");
  }
  return t(lang, "Alternativa general equilibrada.", "Balanced general alternative.");
}

// ── Adaptation advice ───────────────────────────────────────────────────────

export function buildAdaptationAdvice(
  lang: Lang,
  features: MatcherFeatures,
  entry: ModelEntry,
  profile: InteractionProfile
): string[] {
  const advice: string[] = [];
  const caps = entry.capabilities;

  if (profile === "codingAgent") {
    const has = (id: string) => features.signals.some((s) => s.id === id);
    if (!has("tests_acceptance")) {
      advice.push(
        t(
          lang,
          "Tu prompt no define criterios de aceptación: agregá cómo validar el resultado (tests, comandos) para que el agente sepa cuándo terminó.",
          "Your prompt doesn't define acceptance criteria: add how to validate the result (tests, commands) so the agent knows when it's done."
        )
      );
    }
    if (has("repo_paths")) {
      advice.push(
        t(
          lang,
          "Mantené las rutas de archivos exactas como están: el agente las usa para ubicar el trabajo.",
          "Keep the exact file paths as written: the agent uses them to locate the work."
        )
      );
    }
  }

  if ((features.evidence.dataExtraction ?? 0) > 0 && caps?.structuredOutput) {
    advice.push(
      t(
        lang,
        "Ya exigís JSON: definí el schema exacto (campos y tipos) y la regla para valores faltantes; este modelo respeta salida estructurada nativa.",
        "You already require JSON: define the exact schema (fields and types) and the missing-value rule; this model honors native structured output."
      )
    );
  }

  if ((features.evidence.research ?? 0) > 0 && caps?.nativeSearch) {
    advice.push(
      t(
        lang,
        "Como pedís actualidad, acotá el período (por ejemplo, \"desde 2025\") y pedí las fuentes con URL.",
        "Since you ask for recency, constrain the time range (e.g., \"since 2025\") and request sources with URLs."
      )
    );
  }

  if (caps?.promptGuidance) {
    advice.push(lang === "es" ? caps.promptGuidance.es : caps.promptGuidance.en);
  }

  return advice.slice(0, 3);
}

// ── Switching advice ────────────────────────────────────────────────────────

export function buildSwitchingAdvice(
  lang: Lang,
  features: MatcherFeatures,
  profile: InteractionProfile
): string[] {
  const advice: string[] = [];

  if (profile === "codingAgent") {
    advice.push(
      t(
        lang,
        "Si preferís un chat común en lugar de un agente: pegá el código relevante en el prompt (el chat no puede abrir tu repo) y pedí el diff o archivo completo como salida.",
        "If you prefer plain chat instead of an agent: paste the relevant code into the prompt (chat can't open your repo) and ask for a diff or full file as output."
      )
    );
  } else if (profile === "researchAssistant") {
    advice.push(
      t(
        lang,
        "Si usás una IA sin búsqueda web: aportá vos los datos actuales (pegá artículos o cifras) y pedile solo el análisis.",
        "If you use an AI without web search: supply the current data yourself (paste articles or figures) and ask only for the analysis."
      )
    );
  } else if ((features.evidence.dataExtraction ?? 0) > 0) {
    advice.push(
      t(
        lang,
        "Para modelos sin modo JSON nativo: agregá un ejemplo del JSON esperado y la instrucción \"respondé solo con el JSON, sin texto extra\".",
        "For models without native JSON mode: add an example of the expected JSON plus the instruction \"reply with the JSON only, no extra text\"."
      )
    );
  } else {
    advice.push(
      t(
        lang,
        "Para cambiar de IA sin perder calidad: conservá el objetivo y el formato de salida tal como están; ajustá solo los delimitadores al estilo del modelo elegido.",
        "To switch AIs without losing quality: keep the goal and output format as written; only adjust delimiters to the chosen model's style."
      )
    );
  }

  if ((features.evidence.longContext ?? 0) > 0) {
    advice.push(
      t(
        lang,
        "Tu material es largo: si el otro modelo tiene menos contexto, dividí el documento en partes y pedí una síntesis incremental.",
        "Your material is long: if the other model has less context, split the document and ask for an incremental synthesis."
      )
    );
  }

  return advice.slice(0, 2);
}

export function buildTieBreaker(
  lang: Lang,
  primary: ScoredModel,
  runnerUp: ScoredModel,
  primaryEntry: ModelEntry
): string {
  const tops = topContributions(primary, 1);
  if (tops.length) {
    const cat = categoryLabel(tops[0].category, lang);
    return t(
      lang,
      `Empate técnico: elegimos ${primaryEntry.label} por una leve ventaja en ${cat}; la alternativa rinde casi igual.`,
      `Technical tie: we picked ${primaryEntry.label} for a slight edge in ${cat}; the alternative performs almost identically.`
    );
  }
  return t(
    lang,
    `Empate técnico entre las dos primeras opciones: cualquiera funciona bien para este prompt.`,
    `Technical tie between the top two options: either works well for this prompt.`
  );
}
