// lib/matcher/explanations.ts
//
// Template-based bilingual explanations for matcher results. Deterministic:
// every sentence is assembled from detected signals, category evidence, and
// registry capability data — advice always cites something observed in the
// submitted prompt, never generic filler.

import type { InteractionProfile, Lang, MatchCategory, TargetAI } from "@/lib/domain";
import type { ModelEntry } from "@/lib/models";
import type { CategoryContribution, MatcherFeatures, ScoredModel } from "./types";

function t(lang: Lang, es: string, en: string, pt: string, zh: string = en): string {
  // v1.8.7: zh is optional while the Chinese text is written; it falls back to English (zh === en marks it untranslated).
  return { es, en, pt, zh }[lang];
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
  qwen: "Qwen",
  glm: "GLM",
  minimax: "MiniMax",
  doubao: "Doubao",
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

export const CATEGORY_LABEL: Record<MatchCategory, Record<Lang, string>> = {
  chat: { es: "conversación general", en: "general chat", pt: "chat geral", zh: "日常对话" },
  coding: { es: "trabajo con código", en: "code work", pt: "trabalho com código", zh: "代码工作" },
  codingAgent: { es: "tareas de agente sobre repositorios", en: "repository agent tasks", pt: "tarefas de agente em repositório", zh: "基于代码库的智能体任务" },
  research: { es: "investigación con información actual", en: "research with current information", pt: "pesquisa com informação atual", zh: "需要最新信息的研究" },
  longContext: { es: "documentos y contexto largo", en: "long documents and context", pt: "documentos longos e contexto", zh: "长文档和长上下文" },
  multimodal: { es: "contenido multimodal (imágenes, video)", en: "multimodal content (images, video)", pt: "conteúdo multimodal (imagens, vídeo)", zh: "多模态内容（图像、视频）" },
  dataExtraction: { es: "extracción de datos estricta", en: "strict data extraction", pt: "extração estrita de dados", zh: "严格的数据提取" },
  creativeWriting: { es: "escritura creativa", en: "creative writing", pt: "escrita criativa", zh: "创意写作" },
  marketing: { es: "copy de marketing", en: "marketing copy", pt: "textos de marketing", zh: "营销文案" },
  translation: { es: "traducción", en: "translation", pt: "tradução", zh: "翻译" },
  summarization: { es: "resumen de contenido", en: "summarization", pt: "resumo", zh: "内容摘要" },
  tutoring: { es: "estudio y tutoría", en: "study and tutoring", pt: "estudo e tutoria", zh: "学习与辅导" },
  imagePrompts: { es: "prompts para generar imágenes", en: "image-generation prompts", pt: "prompts de geração de imagens", zh: "图像生成提示词" },
  complexReasoning: { es: "razonamiento complejo", en: "complex reasoning", pt: "raciocínio complexo", zh: "复杂推理" },
  fastLightweight: { es: "tareas rápidas y livianas", en: "fast lightweight tasks", pt: "tarefas rápidas e leves", zh: "快速轻量的任务" },
};

function categoryLabel(category: MatchCategory, lang: Lang): string {
  const entry = CATEGORY_LABEL[category];
  return entry[lang];
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

  // Don't repeat near-identical sentences: one reason per distinct signal set.
  const citedSignalSets = new Set<string>();
  for (const c of tops) {
    if (reasons.length >= 2) break;
    const signalNames = features.signals
      .filter((s) => s.categories.includes(c.category))
      .map((s) => s.label.toLowerCase())
      .slice(0, 2);
    const key = signalNames.join("|") || c.category;
    if (citedSignalSets.has(key)) continue;
    citedSignalSets.add(key);

    const evidenceTxt = signalNames.length
      ? t(lang, ` (detectamos: ${signalNames.join(", ")})`, ` (detected: ${signalNames.join(", ")})`, ` (detectado: ${signalNames.join(", ")})`, `（检测到：${signalNames.join("、")}）`)
      : "";
    reasons.push(
      t(
        lang,
        `Tu prompt apunta a ${categoryLabel(c.category, lang)}${evidenceTxt}, y ${entry.label} está entre las mejores opciones para eso.`,
        `Your prompt targets ${categoryLabel(c.category, lang)}${evidenceTxt}, and ${entry.label} is among the strongest options for that.`,
        `Seu prompt aponta para ${categoryLabel(c.category, lang)}${evidenceTxt}, e ${entry.label} está entre as opções mais fortes para isso.`,
        `你的提示词主要涉及${categoryLabel(c.category, lang)}${evidenceTxt}，而${entry.label}是这方面最强的选择之一。`
      )
    );
  }

  if (profile === "codingAgent") {
    reasons.push(
      t(
        lang,
        `Por las rutas, comandos o criterios de validación que incluye, conviene un agente de código que trabaje sobre el repo — no un chat común.`,
        `Given the paths, commands, or validation criteria it includes, a repository coding agent fits better than plain chat.`,
        `Pelos caminhos de arquivo, comandos ou critérios de validação que ele inclui, um agente de programação com acesso ao repositório combina mais do que um chat comum.`,
        `鉴于其中包含的文件路径、命令或验证标准，能直接在代码库中工作的编程智能体比普通聊天更合适。`
      )
    );
  } else if (profile === "researchAssistant" && entry.capabilities?.nativeSearch) {
    reasons.push(
      t(
        lang,
        `Pide información actual o fuentes: ${entry.label} busca en la web y cita fuentes de forma nativa.`,
        `It asks for current information or sources: ${entry.label} searches the web and cites sources natively.`,
        `Ele pede informação atual ou fontes: ${entry.label} busca na web e cita as fontes de forma nativa.`,
        `它需要最新信息或来源：${entry.label}原生支持联网搜索并注明来源。`
      )
    );
  } else if (entry.capabilities?.latencyClass === "fast" && (features.evidence.fastLightweight ?? 0) > 0) {
    reasons.push(
      t(
        lang,
        `Es una tarea corta: ${entry.label} responde rápido y a bajo costo sin sacrificar calidad en pedidos simples.`,
        `It's a short task: ${entry.label} answers fast and cheaply without losing quality on simple requests.`,
        `É uma tarefa curta: ${entry.label} responde rápido e barato, sem perder qualidade em pedidos simples.`,
        `这是一个简短的任务：${entry.label}响应快、成本低，处理简单请求时质量也不打折扣。`
      )
    );
  }

  if (reasons.length < 2) {
    reasons.push(
      t(
        lang,
        `${entry.label} es un asistente general sólido y equilibrado para este tipo de pedido.`,
        `${entry.label} is a solid, balanced general assistant for this kind of request.`,
        `${entry.label} é um assistente geral sólido e equilibrado para este tipo de pedido.`,
        `${entry.label}是处理这类请求的可靠、均衡的通用助手。`
      )
    );
  }
  if (reasons.length < 2) {
    reasons.push(
      t(
        lang,
        "Tu prompt no muestra señales especializadas (código, datos, búsqueda…), así que conviene un asistente conversacional versátil.",
        "Your prompt shows no specialized signals (code, data, search…), so a versatile conversational assistant is the safest fit.",
        "Seu prompt não mostra sinais especializados (código, dados, busca…), então um assistente conversacional versátil é a opção mais segura.",
        "你的提示词没有显示出专门的信号（代码、数据、搜索……），所以选一个全能的对话助手最稳妥。"
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
      `It falls behind on ${categoryLabel(worst.category, lang)} for this prompt.`,
      `Fica atrás em ${categoryLabel(worst.category, lang)} para este prompt.`,
      `对于这个提示词，它在${categoryLabel(worst.category, lang)}方面稍逊一筹。`
    );
  }
  if (altEntry.capabilities?.latencyClass === "slow") {
    return t(lang, "Suele ser más lento y costoso.", "Tends to be slower and more expensive.", "Tende a ser mais lento e mais caro.", "通常更慢，成本也更高。");
  }
  return t(
    lang,
    "Diferencia mínima: cualquiera de los dos funciona bien acá.",
    "Minimal difference: either works well here.",
    "Diferença mínima: qualquer um dos dois funciona bem aqui.",
    "差别很小：两者在这里都能胜任。"
  );
}

export function buildBestAt(lang: Lang, alt: ScoredModel, altEntry: ModelEntry): string {
  const caps = altEntry.capabilities;
  const tops = topContributions(alt, 1);
  if (tops.length && tops[0].fit >= 2) {
    return t(
      lang,
      `Fuerte en ${categoryLabel(tops[0].category, lang)}.`,
      `Strong at ${categoryLabel(tops[0].category, lang)}.`,
      `Forte em ${categoryLabel(tops[0].category, lang)}.`,
      `擅长${categoryLabel(tops[0].category, lang)}。`
    );
  }
  if (caps?.latencyClass === "fast") {
    return t(lang, "Rápido y económico.", "Fast and inexpensive.", "Rápido e barato.", "速度快，成本低。");
  }
  return t(lang, "Alternativa general equilibrada.", "Balanced general alternative.", "Alternativa geral equilibrada.", "均衡的通用替代选择。");
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
          "Your prompt doesn't define acceptance criteria: add how to validate the result (tests, commands) so the agent knows when it's done.",
          "Seu prompt não define critérios de aceitação: diga como validar o resultado (testes, comandos) para o agente saber quando terminou.",
          "你的提示词没有定义验收标准：补充如何验证结果（测试、命令），让智能体知道什么时候算完成。"
        )
      );
    }
    if (has("repo_paths")) {
      advice.push(
        t(
          lang,
          "Mantené las rutas de archivos exactas como están: el agente las usa para ubicar el trabajo.",
          "Keep the exact file paths as written: the agent uses them to locate the work.",
          "Mantenha os caminhos de arquivo exatamente como estão: o agente os usa para localizar o trabalho.",
          "保持文件路径与原文完全一致：智能体要靠它们定位工作内容。"
        )
      );
    }
  }

  if ((features.evidence.dataExtraction ?? 0) > 0 && caps?.structuredOutput) {
    advice.push(
      t(
        lang,
        "Ya exigís JSON: definí el schema exacto (campos y tipos) y la regla para valores faltantes; este modelo respeta salida estructurada nativa.",
        "You already require JSON: define the exact schema (fields and types) and the missing-value rule; this model honors native structured output.",
        "Você já exige JSON: defina o esquema exato (campos e tipos) e a regra para valores ausentes; este modelo respeita a saída estruturada nativa.",
        "你已经要求输出JSON：定义确切的schema（字段和类型）以及缺失值规则；这个模型原生支持结构化输出。"
      )
    );
  }

  if ((features.evidence.research ?? 0) > 0 && caps?.nativeSearch) {
    advice.push(
      t(
        lang,
        "Como pedís actualidad, acotá el período (por ejemplo, \"desde 2025\") y pedí las fuentes con URL.",
        "Since you ask for recency, constrain the time range (e.g., \"since 2025\") and request sources with URLs.",
        "Como você pede atualidade, delimite o período (ex.: \"desde 2025\") e peça fontes com URLs.",
        "既然你需要最新信息，就限定时间范围（例如“2025年以来”），并要求提供带URL的来源。"
      )
    );
  }

  if (caps?.promptGuidance) {
    advice.push(caps.promptGuidance[lang]);
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
        "If you prefer plain chat instead of an agent: paste the relevant code into the prompt (chat can't open your repo) and ask for a diff or full file as output.",
        "Se você preferir um chat comum em vez de um agente: cole o código relevante no prompt (o chat não consegue abrir o seu repositório) e peça um diff ou o arquivo completo como saída.",
        "如果你更想用普通聊天而不是智能体：把相关代码粘贴到提示词里（聊天无法打开你的代码库），并要求输出diff或完整文件。"
      )
    );
  } else if (profile === "researchAssistant") {
    advice.push(
      t(
        lang,
        "Si usás una IA sin búsqueda web: aportá vos los datos actuales (pegá artículos o cifras) y pedile solo el análisis.",
        "If you use an AI without web search: supply the current data yourself (paste articles or figures) and ask only for the analysis.",
        "Se você usar uma IA sem busca na web: forneça você mesmo os dados atuais (cole os artigos ou os números) e peça só a análise.",
        "如果你使用的AI不能联网搜索：自己提供最新数据（粘贴文章或数字），只让它做分析。"
      )
    );
  } else if ((features.evidence.dataExtraction ?? 0) > 0) {
    advice.push(
      t(
        lang,
        "Para modelos sin modo JSON nativo: agregá un ejemplo del JSON esperado y la instrucción \"respondé solo con el JSON, sin texto extra\".",
        "For models without native JSON mode: add an example of the expected JSON plus the instruction \"reply with the JSON only, no extra text\".",
        "Para modelos sem modo JSON nativo: adicione um exemplo do JSON esperado e a instrução \"responda somente com o JSON, sem texto extra\".",
        "对于没有原生JSON模式的模型：附上一个预期JSON的示例，并加上指令“只回复JSON，不要任何其他文字”。"
      )
    );
  } else {
    advice.push(
      t(
        lang,
        "Para cambiar de IA sin perder calidad: conservá el objetivo y el formato de salida tal como están; ajustá solo los delimitadores al estilo del modelo elegido.",
        "To switch AIs without losing quality: keep the goal and output format as written; only adjust delimiters to the chosen model's style.",
        "Para trocar de IA sem perder qualidade: mantenha o objetivo e o formato de saída como estão; ajuste apenas os delimitadores ao estilo do modelo escolhido.",
        "想在更换AI时不降低质量：保持目标和输出格式不变，只把分隔符调整为所选模型的风格。"
      )
    );
  }

  if ((features.evidence.longContext ?? 0) > 0) {
    advice.push(
      t(
        lang,
        "Tu material es largo: si el otro modelo tiene menos contexto, dividí el documento en partes y pedí una síntesis incremental.",
        "Your material is long: if the other model has less context, split the document and ask for an incremental synthesis.",
        "Seu material é longo: se o outro modelo tiver menos contexto, divida o documento e peça uma síntese incremental.",
        "你的材料很长：如果另一个模型的上下文窗口更小，就把文档拆成几部分，并要求逐步汇总。"
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
      `Technical tie: we picked ${primaryEntry.label} for a slight edge in ${cat}; the alternative performs almost identically.`,
      `Empate técnico: escolhemos ${primaryEntry.label} por uma leve vantagem em ${cat}; a alternativa tem um desempenho quase idêntico.`,
      `难分高下：我们选择${primaryEntry.label}，是因为它在${cat}方面略占优势；另一个选项的表现几乎相同。`
    );
  }
  return t(
    lang,
    `Empate técnico entre las dos primeras opciones: cualquiera funciona bien para este prompt.`,
    `Technical tie between the top two options: either works well for this prompt.`,
    `Empate técnico entre as duas primeiras opções: qualquer uma funciona bem para este prompt.`,
    `前两个选项难分高下：对这个提示词来说，两者都能胜任。`
  );
}
