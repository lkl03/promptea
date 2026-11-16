import type { Locale } from "../site";
import type { Purpose, TargetModel } from "../prefill";
import { CHINESE_MODEL_PAGES } from "./chineseModels";

export type ModelPage = {
  slug: TargetModel;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  bullets: Record<Locale, string[]>;
  templates: Array<{
    title: Record<Locale, string>;
    prompt: Record<Locale, string>;
    purpose: Purpose;
  }>;
  faq: Array<{ q: Record<Locale, string>; a: Record<Locale, string> }>;
};

export const modelPages: ModelPage[] = [
  {
    slug: "gpt",
    title: { en: "Prompts for GPT: structure first, ambiguity last", es: "Prompts para GPT: estructura primero, ambigüedad cero", pt: "Prompts para GPT: estrutura primeiro, ambiguidade por último", zh: "GPT提示词：结构优先，杜绝歧义" },
    description: {
      en: "Reusable GPT prompt templates: clear constraints, formats, and iteration loops.",
      es: "Plantillas reutilizables para GPT: restricciones claras, formato, e iteración sin vueltas.",
      pt: "Templates reutilizáveis de prompts para GPT: restrições claras, formatos e ciclos de iteração.",
      zh: "可复用的GPT提示词模板：清晰的约束、明确的输出格式和迭代流程。",
    },
    bullets: {
      en: [
        "Put the instruction first, then context, then output format.",
        "Use delimiters for long context (\\\"\\\"\\\" ... \\\"\\\"\\\").",
        "Ask for questions first if info is missing.",
      ],
      es: [
        "Poné la instrucción primero, después contexto, y al final el formato de salida.",
        "Usá delimitadores si hay mucho texto (\\\"\\\"\\\" ... \\\"\\\"\\\").",
        "Si falta info, pedí preguntas primero (en vez de adivinar).",
      ],
      pt: [
        "Coloque a instrução primeiro, depois o contexto e, por fim, o formato de saída.",
        "Use delimitadores para contexto longo (\\\"\\\"\\\" ... \\\"\\\"\\\").",
        "Peça que ele faça perguntas antes se faltar informação.",
      ],
      zh: [
        "先写指令，再给上下文，最后说明输出格式。",
        "上下文较长时，用分隔符隔开（\\\"\\\"\\\" ... \\\"\\\"\\\"）。",
        "如果信息不全，先让它向你提问。",
      ],
    },
    templates: [
      {
        title: { en: "Clear answer + format", es: "Respuesta clara + formato", pt: "Resposta clara + formato", zh: "清晰回答 + 格式" },
        purpose: "text",
        prompt: {
          en: `Goal: [what you want]
Context: [key facts]
Output format: bullet list with headings.
If info is missing, ask up to 3 questions first.`,
          es: `Objetivo: [qué querés]
Contexto: [hechos clave]
Formato de salida: lista con headings.
Si falta info, haceme hasta 3 preguntas primero.`,
          pt: `Objetivo: [o que você quer]
Contexto: [fatos-chave]
Formato de saída: lista de tópicos com títulos.
Se faltar informação, faça até 3 perguntas antes.`,
          zh: `目标：[你想要什么]
背景：[关键事实]
输出格式：带小标题的要点列表。
如果信息不全，先问我最多3个问题。`,
        },
      },
      {
        title: { en: "Decision memo", es: "Memo de decisión", pt: "Memorando de decisão", zh: "决策备忘录" },
        purpose: "text",
        prompt: {
          en: `Write a decision memo.
Options: [A, B, C]
Constraints: [budget/time]
Return:
- recommendation
- pros/cons per option
- risks
- next steps`,
          es: `Escribí un memo de decisión.
Opciones: [A, B, C]
Restricciones: [presupuesto/tiempo]
Devolvé:
- recomendación
- pros/cons por opción
- riesgos
- próximos pasos`,
          pt: `Escreva um memorando de decisão.
Opções: [A, B, C]
Restrições: [orçamento/prazo]
Retorne:
- recomendação
- prós/contras de cada opção
- riscos
- próximos passos`,
          zh: `写一份决策备忘录。
选项：[A、B、C]
约束：[预算/时间]
返回：
- 推荐方案
- 每个选项的优缺点
- 风险
- 下一步`,
        },
      },
    ],
    faq: [
      {
        q: { en: "How do I reduce generic answers?", es: "¿Cómo reduzco respuestas genéricas?", pt: "Como reduzo as respostas genéricas?", zh: "怎样减少泛泛而谈的回答？" },
        a: {
          en: "Force an output structure and add constraints. Without constraints, the model fills gaps with generic advice.",
          es: "Forzá estructura de salida y meté restricciones. Sin restricciones, la IA rellena con generalidades.",
          pt: "Imponha uma estrutura de saída e adicione restrições. Sem restrições, o modelo preenche as lacunas com conselhos genéricos.",
          zh: "规定输出结构，并加上约束。没有约束，模型就会用泛泛的建议填补空白。",
        },
      },
    ],
  },
  {
    slug: "claude",
    title: { en: "Prompts for Claude: explicit steps and quality bar", es: "Prompts para Claude: pasos explícitos y barra de calidad", pt: "Prompts para Claude: passos explícitos e padrão de qualidade", zh: "Claude提示词：明确步骤和质量标准" },
    description: {
      en: "Templates for Claude that emphasize clear evaluation criteria and careful handling of missing info.",
      es: "Plantillas para Claude con criterios claros y manejo cuidadoso de info faltante.",
      pt: "Templates para o Claude que priorizam critérios de avaliação claros e cuidado com a informação que falta.",
      zh: "适用于Claude的提示词模板：强调清晰的评估标准，并谨慎处理缺失的信息。",
    },
    bullets: {
      en: [
        "Give a checklist of what must be covered.",
        "Ask for a short plan before the final answer (when complex).",
        "Add examples of desired tone/format when needed.",
      ],
      es: [
        "Dale un checklist de lo que sí o sí tiene que cubrir.",
        "Para cosas complejas, pedí un mini-plan antes de la respuesta final.",
        "Si querés consistencia, poné ejemplo de tono/formato.",
      ],
      pt: [
        "Dê um checklist do que precisa ser coberto.",
        "Peça um plano curto antes da resposta final (quando for complexo).",
        "Adicione exemplos do tom/formato desejado quando necessário.",
      ],
      zh: [
        "给出一份必须覆盖的要点清单。",
        "任务复杂时，先让它给出简短的计划，再给最终答案。",
        "需要时，附上你想要的语气/格式示例。",
      ],
    },
    templates: [
      {
        title: { en: "Rubric-based review", es: "Review con rúbrica", pt: "Revisão baseada em rubrica", zh: "按评分细则审查" },
        purpose: "code",
        prompt: {
          en: `Review this code with a rubric.
Rubric: correctness, security, performance, readability, tests.
Return:
- prioritized issues (P0/P1/P2)
- concrete fixes (snippets)
- test checklist`,
          es: `Revisá este código con una rúbrica.
Rúbrica: correctitud, seguridad, performance, legibilidad, tests.
Devolvé:
- issues priorizados (P0/P1/P2)
- fixes concretos (snippets)
- checklist de tests`,
          pt: `Revise este código com uma rubrica.
Rubrica: correção, segurança, desempenho, legibilidade, testes.
Retorne:
- problemas priorizados (P0/P1/P2)
- correções concretas (trechos de código)
- checklist de testes`,
          zh: `按评分细则审查这段代码。
评分细则：正确性、安全性、性能、可读性、测试。
返回：
- 按优先级排列的问题（P0/P1/P2）
- 具体的修复方案（代码片段）
- 测试清单`,
        },
      },
      {
        title: { en: "Long-context summarizer", es: "Resumen de texto largo", pt: "Resumidor de contexto longo", zh: "长文本总结" },
        purpose: "text",
        prompt: {
          en: `Summarize the text below.
Output:
1) 10 bullets (key facts)
2) 5 decisions
3) 5 open questions
Text:
"""[paste]"""`,
          es: `Resumí el texto de abajo.
Salida:
1) 10 bullets (hechos clave)
2) 5 decisiones
3) 5 preguntas abiertas
Texto:
"""[pegá]"""`,
          pt: `Resuma o texto abaixo.
Saída:
1) 10 tópicos (fatos-chave)
2) 5 decisões
3) 5 perguntas em aberto
Texto:
"""[cole aqui]"""`,
          zh: `总结下面的文本。
输出：
1）10条要点（关键事实）
2）5项决定
3）5个待解决的问题
文本：
"""[粘贴你的文本]"""`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Should I ask for chain-of-thought?", es: "¿Conviene pedir razonamiento paso a paso?", pt: "Devo pedir chain-of-thought?", zh: "要不要让它输出思维链？" },
        a: {
          en: "Ask for a brief plan or key steps instead of full hidden reasoning. It keeps output short and useful.",
          es: "Pedí un plan breve o pasos clave (no el razonamiento completo). Te da utilidad sin inflar el texto.",
          pt: "Peça um plano breve ou os passos principais em vez do raciocínio oculto completo. Isso mantém a saída curta e útil.",
          zh: "让它给出简短的计划或关键步骤，而不是完整的内部推理。这样输出既简短又有用。",
        },
      },
    ],
  },
  {
    slug: "gemini",
    title: { en: "Prompts for Gemini: specify goal + format, iterate", es: "Prompts para Gemini: objetivo + formato, iteración", pt: "Prompts para Gemini: defina objetivo + formato e itere", zh: "Gemini提示词：讲清目标和格式，然后迭代" },
    description: {
      en: "Practical Gemini prompt templates focused on format, constraints, and iteration loops.",
      es: "Plantillas para Gemini enfocadas en formato, restricciones e iteración.",
      pt: "Templates práticos de prompts para o Gemini, com foco em formato, restrições e ciclos de iteração.",
      zh: "实用的Gemini提示词模板，聚焦输出格式、约束和迭代流程。",
    },
    bullets: {
      en: [
        "State the goal and the output format up front.",
        "Use examples when you need strict structure.",
        "Tell it what to do when uncertain (ask questions / say 'unknown').",
      ],
      es: [
        "Decí objetivo y formato de salida al inicio.",
        "Usá ejemplos si necesitás estructura estricta.",
        "Aclarale qué hacer si no está seguro (preguntar / 'desconocido').",
      ],
      pt: [
        "Declare o objetivo e o formato de saída logo no início.",
        "Use exemplos quando precisar de uma estrutura estrita.",
        "Diga o que fazer em caso de incerteza (fazer perguntas / dizer 'desconhecido').",
      ],
      zh: [
        "一开始就说明目标和输出格式。",
        "需要严格的结构时，给出示例。",
        "告诉它不确定时该怎么做（提问/回答“未知”）。",
      ],
    },
    templates: [
      {
        title: { en: "Strict JSON extraction", es: "Extracción JSON estricta", pt: "Extração em JSON estrito", zh: "严格的JSON提取" },
        purpose: "data",
        prompt: {
          en: `Return ONLY JSON.
Schema: {"items":[{"name":"string","value":"number|null"}]}
Text:
"""[paste]"""`,
          es: `Devolvé SOLO JSON.
Esquema: {"items":[{"name":"string","value":"number|null"}]}
Texto:
"""[pegá]"""`,
          pt: `Retorne SOMENTE JSON.
Esquema: {"items":[{"name":"string","value":"number|null"}]}
Texto:
"""[cole aqui]"""`,
          zh: `只返回JSON。
Schema：{"items":[{"name":"string","value":"number|null"}]}
文本：
"""[粘贴你的文本]"""`,
        },
      },
      {
        title: { en: "Compare options table", es: "Tabla comparativa de opciones", pt: "Tabela de comparação de opções", zh: "选项对比表" },
        purpose: "text",
        prompt: {
          en: `Compare these options: [A, B, C]
Output as a table with columns: Option | Pros | Cons | Risks | Best for.`,
          es: `Compará estas opciones: [A, B, C]
Salida: tabla con columnas Opción | Pros | Contras | Riesgos | Mejor para.`,
          pt: `Compare estas opções: [A, B, C]
Saída em tabela com as colunas: Opção | Prós | Contras | Riscos | Ideal para.`,
          zh: `比较这些选项：[A、B、C]
以表格输出，列为：选项 | 优点 | 缺点 | 风险 | 最适合`,
        },
      },
    ],
    faq: [
      {
        q: { en: "How do I avoid verbose outputs?", es: "¿Cómo evito que se vaya de largo?", pt: "Como evito respostas prolixas?", zh: "怎样避免输出过于冗长？" },
        a: {
          en: "Set a max length (e.g., '<= 120 words') or fixed number of bullets/rows.",
          es: "Poné límite (ej: '<= 120 palabras') o número fijo de bullets/filas.",
          pt: "Defina um tamanho máximo (ex.: '<= 120 palavras') ou um número fixo de tópicos/linhas.",
          zh: "设定长度上限（例如“<= 120字”），或固定要点/行的数量。",
        },
      },
    ],
  },
  {
    slug: "grok",
    title: { en: "Prompts for Grok: be direct, ask for checks", es: "Prompts para Grok: directo y con checks", pt: "Prompts para Grok: seja direto, peça verificações", zh: "Grok提示词：直截了当，要求自查" },
    description: {
      en: "Templates that ask Grok for concrete outputs and quick validation steps.",
      es: "Plantillas que piden outputs concretos y pasos de validación rápidos.",
      pt: "Templates que pedem ao Grok entregas concretas e etapas rápidas de validação.",
      zh: "Grok提示词模板：要求给出具体产出、标明信息时效，并附上快速验证步骤，减少空泛的回答。",
    },
    bullets: {
      en: [
        "Keep the ask direct: task + constraints + format.",
        "Request a short sanity-check section (assumptions, risks).",
        "Prefer concrete deliverables (bullets, diff, checklist).",
      ],
      es: [
        "Sé directo: tarea + restricciones + formato.",
        "Pedí un sanity-check corto (supuestos, riesgos).",
        "Preferí entregables concretos (bullets, diff, checklist).",
      ],
      pt: [
        "Mantenha o pedido direto: tarefa + restrições + formato.",
        "Peça uma seção curta de checagem (suposições, riscos).",
        "Prefira entregas concretas (tópicos, diff, checklist).",
      ],
      zh: [
        "要求直截了当：任务 + 约束 + 格式。",
        "要求附上一小节合理性检查（假设、风险）。",
        "优先要具体的交付物（要点列表、diff、检查清单）。",
      ],
    },
    templates: [
      {
        title: { en: "Fast critique (assumptions)", es: "Crítica rápida (supuestos)", pt: "Crítica rápida (suposições)", zh: "快速点评（找出假设）" },
        purpose: "text",
        prompt: {
          en: `Critique this plan.
Return:
- 5 assumptions
- 5 risks
- 3 alternatives
Plan:
"""[paste]"""`,
          es: `Criticá este plan.
Devolvé:
- 5 supuestos
- 5 riesgos
- 3 alternativas
Plan:
"""[pegá]"""`,
          pt: `Critique este plano.
Retorne:
- 5 suposições
- 5 riscos
- 3 alternativas
Plano:
"""[cole aqui]"""`,
          zh: `批判性地审视这份计划。
返回：
- 5个假设
- 5个风险
- 3个替代方案
计划：
"""[粘贴你的计划]"""`,
        },
      },
      {
        title: { en: "Code bug triage", es: "Triage de bug de código", pt: "Triagem de bug de código", zh: "代码Bug排查" },
        purpose: "code",
        prompt: {
          en: `Bug report:
Expected:
Actual:
Logs:
Code snippet:

Return:
- most likely cause
- 3 checks to confirm
- fix suggestion`,
          es: `Bug:
Expected:
Actual:
Logs:
Snippet:

Devolvé:
- causa más probable
- 3 checks para confirmar
- fix sugerido`,
          pt: `Relato do bug:
Esperado:
Real:
Logs:
Trecho de código:

Retorne:
- causa mais provável
- 3 verificações para confirmar
- sugestão de correção`,
          zh: `Bug报告：
预期结果：
实际结果：
日志：
代码片段：

返回：
- 最可能的原因
- 3项用于确认的检查
- 修复建议`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Why ask for sanity checks?", es: "¿Por qué pedir sanity checks?", pt: "Por que pedir checagens?", zh: "为什么要让它做合理性检查？" },
        a: {
          en: "It forces the model to surface assumptions instead of confidently inventing missing context.",
          es: "Lo obliga a explicitar supuestos en vez de inventar contexto con seguridad falsa.",
          pt: "Isso obriga o modelo a expor as suposições em vez de inventar, com toda a confiança, o contexto que falta.",
          zh: "这会迫使模型把假设摆到明面上，而不是自信满满地编造缺失的背景信息。",
        },
      },
    ],
  },
  {
    slug: "kimi",
    title: { en: "Prompts for Kimi: structure + constraints", es: "Prompts para Kimi: estructura + restricciones", pt: "Prompts para Kimi: estrutura + restrições", zh: "Kimi提示词：结构 + 约束" },
    description: {
      en: "General prompt templates designed to keep outputs structured and practical.",
      es: "Plantillas generales para mantener outputs estructurados y prácticos.",
      pt: "Templates gerais de prompts pensados para manter as respostas estruturadas e práticas.",
      zh: "Kimi提示词模板：长文档分析时把原文和指令分开，要求结构化输出，让结果清晰、切实可用。",
    },
    bullets: {
      en: [
        "Use a fixed output structure (headings, bullets, steps).",
        "Add constraints and acceptance criteria.",
        "Ask for questions if critical info is missing.",
      ],
      es: [
        "Usá estructura fija (headings, bullets, pasos).",
        "Sumá restricciones y criterios de aceptación.",
        "Si falta info crítica, pedí preguntas.",
      ],
      pt: [
        "Use uma estrutura de saída fixa (títulos, tópicos, passos).",
        "Adicione restrições e critérios de aceitação.",
        "Peça que ele faça perguntas se faltar informação crítica.",
      ],
      zh: [
        "使用固定的输出结构（小标题、要点、步骤）。",
        "加上约束和验收标准。",
        "如果缺少关键信息，让它先提问。",
      ],
    },
    templates: [
      {
        title: { en: "Explain + example + pitfalls", es: "Explicación + ejemplo + errores", pt: "Explicação + exemplo + armadilhas", zh: "讲解 + 示例 + 常见误区" },
        purpose: "study",
        prompt: {
          en: `Teach me: [topic]
Return:
- intuition
- formal definition
- worked example
- common pitfalls
- 5 practice questions`,
          es: `Enseñame: [tema]
Devolvé:
- intuición
- definición formal
- ejemplo resuelto
- errores comunes
- 5 preguntas de práctica`,
          pt: `Me ensine: [assunto]
Retorne:
- intuição
- definição formal
- exemplo resolvido
- armadilhas comuns
- 5 questões para praticar`,
          zh: `教我：[主题]
返回：
- 直观理解
- 正式定义
- 例题详解
- 常见误区
- 5道练习题`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Do templates differ by model?", es: "¿Cambian las plantillas según el modelo?", pt: "Os templates mudam de um modelo para outro?", zh: "不同模型的模板会不一样吗？" },
        a: {
          en: "Core structure is the same. What changes is how strict you must be about format and validation.",
          es: "La estructura base es la misma. Lo que cambia es cuán estricto tenés que ser con formato y validación.",
          pt: "A estrutura central é a mesma. O que muda é o quanto você precisa ser rigoroso com formato e validação.",
          zh: "核心结构是一样的。不同的是你在格式和验证上需要多严格。",
        },
      },
    ],
  },
  {
    slug: "deepseek",
    title: { en: "Prompts for DeepSeek: explicit format and tests", es: "Prompts para DeepSeek: formato explícito y tests", pt: "Prompts para DeepSeek: formato explícito e testes", zh: "DeepSeek提示词：明确格式，配上测试" },
    description: {
      en: "Templates for engineering tasks: specs, implementations, and test-driven outputs.",
      es: "Plantillas para tareas de ingeniería: specs, implementaciones y salida con tests.",
      pt: "Templates para tarefas de engenharia: especificações, implementações e entregas guiadas por testes.",
      zh: "面向工程任务的提示词模板：需求规格、代码实现，以及以测试驱动的输出。",
    },
    bullets: {
      en: [
        "Specify the deliverable (spec, code, tests).",
        "Ask for edge cases and a test checklist.",
        "Prefer smaller steps for complex tasks.",
      ],
      es: [
        "Definí el entregable (spec, código, tests).",
        "Pedí casos límite y checklist de tests.",
        "Para cosas complejas: pasos cortos.",
      ],
      pt: [
        "Especifique a entrega (especificação, código, testes).",
        "Peça casos de borda e um checklist de testes.",
        "Prefira passos menores em tarefas complexas.",
      ],
      zh: [
        "明确交付物（规格说明、代码、测试）。",
        "要求列出边界情况和测试清单。",
        "复杂任务尽量拆成小步骤。",
      ],
    },
    templates: [
      {
        title: { en: "Implement from spec (with tests)", es: "Implementar desde spec (con tests)", pt: "Implementar a partir da especificação (com testes)", zh: "按规格实现（附测试）" },
        purpose: "code",
        prompt: {
          en: `Implement this feature:
[spec]

Constraints:
- language: [x]
- style: [x]
Return:
1) brief plan
2) code
3) tests
4) how to run`,
          es: `Implementá esta feature:
[spec]

Restricciones:
- lenguaje: [x]
- estilo: [x]
Devolvé:
1) plan breve
2) código
3) tests
4) cómo correrlo`,
          pt: `Implemente esta funcionalidade:
[especificação]

Restrições:
- linguagem: [x]
- estilo: [x]
Retorne:
1) plano breve
2) código
3) testes
4) como executar`,
          zh: `实现这个功能：
[规格说明]

约束：
- 编程语言：[x]
- 代码风格：[x]
返回：
1）简要计划
2）代码
3）测试
4）运行方法`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Why insist on tests?", es: "¿Por qué insistir con tests?", pt: "Por que insistir em testes?", zh: "为什么一定要有测试？" },
        a: {
          en: "It forces the solution to be verifiable. Without tests, you get plausible but brittle code.",
          es: "Te obliga a que sea verificable. Sin tests, te da código plausible pero frágil.",
          pt: "Isso obriga a solução a ser verificável. Sem testes, você recebe um código plausível, mas frágil.",
          zh: "测试迫使方案可以被验证。没有测试，你得到的代码看似合理，实则脆弱。",
        },
      },
    ],
  },
  {
    slug: "perplexity",
    title: { en: "Prompts for Perplexity: specific questions, sourced answers", es: "Prompts para Perplexity: preguntas específicas, respuestas con fuentes", pt: "Prompts para Perplexity: perguntas específicas, respostas com fontes", zh: "Perplexity提示词：问题具体，回答有据" },
    description: {
      en: "Templates for Perplexity's Agent API presets (fast, low, medium, high, xhigh): questions that seed a good web search, capped lists and honest 'the sources don't say' answers.",
      es: "Plantillas para los presets de la Agent API de Perplexity (fast, low, medium, high, xhigh): preguntas que siembran una buena búsqueda web, listas acotadas y respuestas honestas de 'las fuentes no lo dicen'.",
      pt: "Templates para os presets da Agent API da Perplexity (fast, low, medium, high, xhigh): perguntas que geram uma boa busca na web, listas com limite e respostas honestas do tipo 'as fontes não dizem'.",
      zh: "适用于Perplexity Agent API预设（fast、low、medium、high、xhigh）的提示词模板：能引出好的网络搜索的问题、限定长度的列表，以及诚实的“来源中没有提到”式回答。",
    },
    bullets: {
      en: [
        "Perplexity searches the web and reads pages before it answers, so your prompt seeds the search: make the question specific and use the vocabulary the relevant pages would use.",
        "Keep instructions short and give it permission to say the sources do not answer the question, and to flag results that only nearly match (a different year, a related company, a similar name).",
        "Cap list lengths and use at most five sections. Do not paste example answers: a search latches onto their topic, so describe the structure you want instead.",
        "Domain and recency limits are API parameters, and citations come back separately: do not ask for URLs or 'only site X' in the prose, and read the sources from the response's search results.",
        "Pick the preset by the size of the job: fast for a single fact, low for everyday research, medium for multi-hop questions across sources, high for an exhaustive report, xhigh for open-ended agentic work.",
      ],
      es: [
        "Perplexity busca en la web y lee páginas antes de responder, así que tu prompt siembra la búsqueda: hacé la pregunta específica y usá el vocabulario que usarían las páginas relevantes.",
        "Mantené las instrucciones cortas y dale permiso para decir que las fuentes no responden la pregunta y para marcar los resultados que solo coinciden parcialmente (otro año, una empresa relacionada, un nombre parecido).",
        "Limitá el largo de las listas y usá como máximo cinco secciones. No pegues respuestas de ejemplo: la búsqueda se engancha con su tema; describí en cambio la estructura que querés.",
        "Los límites de dominio y de fecha son parámetros de la API y las citas vuelven por separado: no pidas URLs ni 'solo del sitio X' en la prosa, y leé las fuentes desde los resultados de búsqueda de la respuesta.",
        "Elegí el preset según el tamaño del trabajo: fast para un dato puntual, low para investigación del día a día, medium para preguntas de varios saltos entre fuentes, high para un informe exhaustivo, xhigh para trabajo agéntico abierto.",
      ],
      pt: [
        "A Perplexity busca na web e lê páginas antes de responder, então o seu prompt alimenta a busca: faça uma pergunta específica e use o vocabulário que as páginas relevantes usariam.",
        "Mantenha as instruções curtas e dê permissão para dizer que as fontes não respondem à pergunta e para sinalizar resultados que só quase coincidem (outro ano, uma empresa relacionada, um nome parecido).",
        "Limite o tamanho das listas e use no máximo cinco seções. Não cole respostas de exemplo: a busca se prende ao assunto delas, então descreva a estrutura que você quer.",
        "Os limites de domínio e de período são parâmetros da API, e as citações voltam separadas: não peça URLs nem 'somente o site X' em prosa, e leia as fontes nos resultados de busca da resposta.",
        "Escolha o preset pelo tamanho do trabalho: fast para um único fato, low para a pesquisa do dia a dia, medium para perguntas em vários saltos entre fontes, high para um relatório exaustivo, xhigh para trabalho agêntico aberto.",
      ],
      zh: [
        "Perplexity会先搜索网络、阅读网页，再作答，所以你的提示词决定了搜索从哪里开始：问题要具体，并使用相关网页会用的词汇。",
        "指令保持简短，并允许它说明来源无法回答这个问题，也允许它标出只是近似匹配的结果（年份不同、相关公司、名称相似）。",
        "限制列表长度，最多分五个部分。不要粘贴示例回答：搜索会被示例的主题带偏，所以改为描述你想要的结构。",
        "域名和时间范围限制属于API参数，引用来源也会单独返回：不要在正文里要求提供URL或“只用X网站”，来源请从响应的搜索结果中读取。",
        "按任务规模选择预设：fast适合查单个事实，low适合日常研究，medium适合需要跨来源多步推理的问题，high适合详尽的报告，xhigh适合开放式的智能体任务。",
      ],
    },
    templates: [
      {
        title: { en: "Sourced research question", es: "Pregunta de investigación con fuentes", pt: "Pergunta de pesquisa com fontes", zh: "有来源支撑的研究问题" },
        purpose: "text",
        prompt: {
          en: `What changed in [topic, with country/product and year] since [month year]?
Answer in at most 5 bullets, most relevant first, one sentence each.
If the sources do not cover something, say so instead of guessing.
If a result is about a different year, company or product, state the mismatch first.`,
          es: `¿Qué cambió en [tema, con país/producto y año] desde [mes año]?
Respondé en 5 bullets como máximo, lo más relevante primero, una oración cada uno.
Si las fuentes no cubren algo, decilo en vez de adivinar.
Si un resultado es de otro año, empresa o producto, marcá primero la diferencia.`,
          pt: `O que mudou em [assunto, com país/produto e ano] desde [mês ano]?
Responda em no máximo 5 tópicos, do mais relevante ao menos relevante, uma frase cada.
Se as fontes não cobrirem algo, diga isso em vez de adivinhar.
Se um resultado for sobre outro ano, empresa ou produto, aponte a diferença primeiro.`,
          zh: `自[年月]以来，[主题，含国家/产品和年份]有哪些变化？
最多用5条要点回答，最相关的放在前面，每条一句话。
如果来源没有涉及某一点，请直接说明，不要猜测。
如果某个结果涉及的是不同的年份、公司或产品，先指出这个不一致。`,
        },
      },
      {
        title: { en: "Research brief (high / xhigh)", es: "Brief de investigación (high / xhigh)", pt: "Briefing de pesquisa (high / xhigh)", zh: "研究简报（high / xhigh）" },
        purpose: "text",
        prompt: {
          en: `Research brief: [question].
Scope: [what is in and out of scope]. Period: [dates].
Report format: a short summary, then at most 5 sections, each with the key finding and the evidence behind it.
Compare [A] and [B] on [criteria]. If sources disagree, show both positions.
If the sources do not answer part of the brief, say which part.`,
          es: `Brief de investigación: [pregunta].
Alcance: [qué entra y qué no]. Período: [fechas].
Formato del informe: un resumen corto y después como máximo 5 secciones, cada una con el hallazgo clave y la evidencia que lo respalda.
Compará [A] y [B] según [criterios]. Si las fuentes discrepan, mostrá ambas posturas.
Si las fuentes no responden una parte del brief, decí cuál.`,
          pt: `Briefing de pesquisa: [pergunta].
Escopo: [o que entra e o que fica de fora]. Período: [datas].
Formato do relatório: um resumo curto e depois no máximo 5 seções, cada uma com o principal achado e a evidência que o sustenta.
Compare [A] e [B] em [critérios]. Se as fontes discordarem, mostre as duas posições.
Se as fontes não responderem a parte do briefing, diga qual parte.`,
          zh: `研究简报：[问题]。
范围：[哪些在范围内，哪些不在]。时间段：[日期]。
报告格式：先写简短摘要，然后最多5个部分，每部分写出关键发现及其依据。
按[标准]比较[A]和[B]。如果来源之间有分歧，列出双方观点。
如果来源无法回答简报中的某一部分，说明是哪一部分。`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Which Perplexity preset should I use?", es: "¿Qué preset de Perplexity conviene usar?", pt: "Qual preset da Perplexity devo usar?", zh: "该用Perplexity的哪个预设？" },
        a: {
          en: "Match the preset to the job: fast for single-fact lookups, low for everyday research (the preset Perplexity's own examples use), medium for multi-hop questions, high for exhaustive coverage, xhigh for open-ended agentic work. The models list on this page shows each one with its verification date.",
          es: "Elegí el preset según el trabajo: fast para datos puntuales, low para investigación del día a día (el preset que usan los ejemplos de Perplexity), medium para preguntas de varios saltos, high para cobertura exhaustiva, xhigh para trabajo agéntico abierto. La lista de modelos de esta página muestra cada uno con su fecha de verificación.",
          pt: "Combine o preset com o trabalho: fast para consultas de um único fato, low para a pesquisa do dia a dia (o preset usado nos exemplos da própria Perplexity), medium para perguntas em vários saltos, high para cobertura exaustiva, xhigh para trabalho agêntico aberto. A lista de modelos desta página mostra cada um com a data de verificação.",
          zh: "根据任务选择预设：fast用于查询单个事实，low用于日常研究（Perplexity自己的示例用的就是这个预设），medium用于需要多步推理的问题，high用于全面详尽的覆盖，xhigh用于开放式的智能体任务。本页的模型列表列出了每个预设及其核实日期。",
        },
      },
      {
        q: { en: "Should I paste URLs or examples into a Perplexity prompt?", es: "¿Conviene pegar URLs o ejemplos en un prompt de Perplexity?", pt: "Devo colar URLs ou exemplos em um prompt para a Perplexity?", zh: "要不要在Perplexity提示词里粘贴URL或示例？" },
        a: {
          en: "Not in the prose. Citations come back as separate results, domain and date limits are API filters, and example answers pull the search toward their own topic. Describe the structure you want and let the search find the sources.",
          es: "No en la prosa. Las citas vuelven como resultados aparte, los límites de dominio y fecha son filtros de la API y las respuestas de ejemplo desvían la búsqueda hacia su propio tema. Describí la estructura que querés y dejá que la búsqueda encuentre las fuentes.",
          pt: "Não em prosa. As citações voltam como resultados separados, os limites de domínio e data são filtros da API, e respostas de exemplo puxam a busca para o assunto delas. Descreva a estrutura que você quer e deixe a busca encontrar as fontes.",
          zh: "不要写在正文里。引用会作为单独的结果返回，域名和日期限制是API过滤条件，而示例回答会把搜索引向示例本身的主题。描述你想要的结构，让搜索去找来源。",
        },
      },
      {
        q: { en: "What happened to Sonar?", es: "¿Qué pasó con Sonar?", pt: "O que aconteceu com o Sonar?", zh: "Sonar怎么了？" },
        a: {
          en: "Perplexity ended support for Sonar Chat Completions on September 27, 2026 and points new work to the Agent API, where you choose a preset. Promptea's registry follows that change.",
          es: "Perplexity terminó el soporte de Sonar Chat Completions el 27 de septiembre de 2026 y dirige el trabajo nuevo a la Agent API, donde se elige un preset. El registro de Promptea sigue ese cambio.",
          pt: "A Perplexity encerrou o suporte ao Sonar via Chat Completions em 27 de setembro de 2026 e direciona os novos trabalhos para a Agent API, onde você escolhe um preset. O registro do Promptea acompanha essa mudança.",
          zh: "Perplexity已于2026年9月27日停止支持Sonar Chat Completions，并引导新项目改用Agent API，在其中选择预设。Promptea的模型注册表已同步这一变化。",
        },
      },
    ],
  },
  // v1.8.6: Qwen, GLM, MiniMax, Doubao (lib/seo/content/chineseModels.ts).
  ...CHINESE_MODEL_PAGES,
];

export function getModelPage(slug: string): ModelPage | undefined {
  return modelPages.find((m) => m.slug === slug);
}
