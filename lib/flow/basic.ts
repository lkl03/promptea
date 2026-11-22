// lib/flow/basic.ts
//
// v1.8.9 — the basic prompt flow, built WITHOUT any AI call. It is what the
// page shows when Claude is not available (no key, monthly/daily cap reached,
// the visitor's daily quota used, provider down) so the feature always works.
//
// Four templates chosen from the task category the deterministic matcher
// detects (code, writing, research, general). Each one has a parallel branch,
// the main task goes verbatim into the first step, and later steps reference
// earlier outputs with a localized placeholder ("[Output of step 1]").

import type { Lang, MatchCategory } from "@/lib/domain";
import type { FlowStepDraft } from "./types";

type L = Record<Lang, string>;
type TemplateStep = { title: L; goal: L; prompt: L; output: L; dependsOn: number[] };
export type BasicFamily = "code" | "writing" | "research" | "general";

/** "[Output of step 2]" in each language. */
export function stepPlaceholder(lang: Lang, id: number): string {
  switch (lang) {
    case "es":
      return `[Resultado del paso ${id}]`;
    case "pt":
      return `[Resultado da etapa ${id}]`;
    case "zh":
      return `[第${id}步的结果]`;
    default:
      return `[Output of step ${id}]`;
  }
}

export function familyForCategory(category: MatchCategory | undefined): BasicFamily {
  switch (category) {
    case "coding":
    case "codingAgent":
      return "code";
    case "creativeWriting":
    case "marketing":
    case "translation":
      return "writing";
    case "research":
    case "complexReasoning":
    case "dataExtraction":
    case "longContext":
    case "summarization":
      return "research";
    default:
      return "general";
  }
}

const TASK: L = { es: "Tarea", en: "Task", pt: "Tarefa", zh: "任务" };
const REQUEST: L = { es: "Pedido", en: "Request", pt: "Pedido", zh: "需求" };

const TEMPLATES: Record<BasicFamily, TemplateStep[]> = {
  code: [
    {
      title: { es: "Definir el alcance", en: "Define the scope", pt: "Definir o escopo", zh: "明确范围" },
      goal: {
        es: "Convertir la tarea en requisitos y criterios de aceptación verificables.",
        en: "Turn the task into requirements and testable acceptance criteria.",
        pt: "Transformar a tarefa em requisitos e critérios de aceite verificáveis.",
        zh: "把任务转化为需求和可验证的验收标准。",
      },
      prompt: {
        es: "Actuá como ingeniero/a de software sénior. Antes de escribir código, convertí esta tarea en una especificación breve: objetivo, requisitos, casos borde, supuestos y criterios de aceptación verificables. Si falta información clave, listá primero las preguntas.\n\n{TASK}:\n{task}",
        en: "Act as a senior software engineer. Before writing any code, turn this task into a short specification: goal, requirements, edge cases, assumptions and testable acceptance criteria. If key information is missing, list your questions first.\n\n{TASK}:\n{task}",
        pt: "Atue como engenheiro(a) de software sênior. Antes de escrever código, transforme esta tarefa em uma especificação curta: objetivo, requisitos, casos de borda, premissas e critérios de aceite verificáveis. Se faltar informação importante, liste primeiro as perguntas.\n\n{TASK}:\n{task}",
        zh: "请以资深软件工程师的身份工作。在写任何代码之前，先把这项任务整理成一份简短的规格说明：目标、需求、边界情况、前提假设，以及可验证的验收标准。如果缺少关键信息，请先列出你的问题。\n\n{TASK}：\n{task}",
      },
      output: { es: "Especificación con criterios de aceptación.", en: "A spec with acceptance criteria.", pt: "Especificação com critérios de aceite.", zh: "带验收标准的规格说明。" },
      dependsOn: [],
    },
    {
      title: { es: "Implementar", en: "Implement", pt: "Implementar", zh: "实现" },
      goal: {
        es: "Escribir la solución siguiendo la especificación, sin salirse del alcance.",
        en: "Write the solution against the spec, without leaving its scope.",
        pt: "Escrever a solução seguindo a especificação, sem sair do escopo.",
        zh: "按规格说明编写方案，不超出范围。",
      },
      prompt: {
        es: "Implementá la solución siguiendo esta especificación. Primero explicá el enfoque en pocas líneas; después el código completo, con nombres claros y manejo de errores. No cambies nada fuera del alcance.\n\nEspecificación:\n{s1}",
        en: "Implement the solution following this specification. First explain the approach in a few lines; then give the complete code, with clear names and error handling. Do not change anything outside the scope.\n\nSpecification:\n{s1}",
        pt: "Implemente a solução seguindo esta especificação. Primeiro explique a abordagem em poucas linhas; depois o código completo, com nomes claros e tratamento de erros. Não mude nada fora do escopo.\n\nEspecificação:\n{s1}",
        zh: "请按照这份规格说明实现方案。先用几行说明思路，然后给出完整代码，命名清晰并处理错误。不要修改范围之外的任何内容。\n\n规格说明：\n{s1}",
      },
      output: { es: "Código y explicación del enfoque.", en: "Code and a short note on the approach.", pt: "Código e explicação da abordagem.", zh: "代码及思路说明。" },
      dependsOn: [1],
    },
    {
      title: { es: "Escribir las pruebas", en: "Write the tests", pt: "Escrever os testes", zh: "编写测试" },
      goal: {
        es: "Cubrir cada criterio de aceptación con pruebas, en paralelo a la implementación.",
        en: "Cover every acceptance criterion with tests, in parallel with the implementation.",
        pt: "Cobrir cada critério de aceite com testes, em paralelo à implementação.",
        zh: "为每条验收标准编写测试，与实现并行进行。",
      },
      prompt: {
        es: "A partir de esta especificación, escribí las pruebas: casos felices, casos borde y errores esperados, cada una ligada a un criterio de aceptación. No implementes la solución.\n\nEspecificación:\n{s1}",
        en: "From this specification, write the tests: happy paths, edge cases and expected errors, each one tied to an acceptance criterion. Do not implement the solution.\n\nSpecification:\n{s1}",
        pt: "A partir desta especificação, escreva os testes: casos felizes, casos de borda e erros esperados, cada um ligado a um critério de aceite. Não implemente a solução.\n\nEspecificação:\n{s1}",
        zh: "根据这份规格说明编写测试：正常路径、边界情况和预期错误，每个测试都对应一条验收标准。不要实现方案本身。\n\n规格说明：\n{s1}",
      },
      output: { es: "Pruebas por criterio.", en: "Tests mapped to the criteria.", pt: "Testes por critério.", zh: "按标准对应的测试。" },
      dependsOn: [1],
    },
    {
      title: { es: "Revisar e integrar", en: "Review and integrate", pt: "Revisar e integrar", zh: "审查与整合" },
      goal: {
        es: "Cruzar código y pruebas, corregir lo que falle y dejar la versión final.",
        en: "Check the code against the tests, fix what fails and produce the final version.",
        pt: "Cruzar código e testes, corrigir o que falhar e deixar a versão final.",
        zh: "对照测试检查代码，修复问题，给出最终版本。",
      },
      prompt: {
        es: "Revisá este código contra estas pruebas y la especificación. Señalá errores, riesgos y lo que no cumple; después devolvé la versión corregida y cómo correr las pruebas.\n\nCódigo:\n{s2}\n\nPruebas:\n{s3}",
        en: "Review this code against these tests and the specification. Point out bugs, risks and anything that does not meet it; then return the corrected version and how to run the tests.\n\nCode:\n{s2}\n\nTests:\n{s3}",
        pt: "Revise este código contra estes testes e a especificação. Aponte erros, riscos e o que não atende; depois devolva a versão corrigida e como rodar os testes.\n\nCódigo:\n{s2}\n\nTestes:\n{s3}",
        zh: "请对照这些测试和规格说明审查这段代码。指出错误、风险和不符合要求的地方，然后给出修正后的版本以及运行测试的方法。\n\n代码：\n{s2}\n\n测试：\n{s3}",
      },
      output: { es: "Versión final revisada.", en: "The reviewed final version.", pt: "Versão final revisada.", zh: "审查后的最终版本。" },
      dependsOn: [2, 3],
    },
  ],
  writing: [
    {
      title: { es: "Armar el brief", en: "Write the brief", pt: "Montar o briefing", zh: "写简报" },
      goal: {
        es: "Fijar objetivo, público, tono y formato antes de escribir.",
        en: "Pin down goal, audience, tone and format before writing.",
        pt: "Definir objetivo, público, tom e formato antes de escrever.",
        zh: "动笔前先确定目标、受众、语气和格式。",
      },
      prompt: {
        es: "Antes de escribir, armá un brief de esta pieza: objetivo, público, tono, mensaje principal, formato y largo. Si falta algo importante, hacé hasta 3 preguntas.\n\n{REQUEST}:\n{task}",
        en: "Before writing, put together a brief for this piece: goal, audience, tone, key message, format and length. If something important is missing, ask up to 3 questions.\n\n{REQUEST}:\n{task}",
        pt: "Antes de escrever, monte um briefing desta peça: objetivo, público, tom, mensagem principal, formato e extensão. Se faltar algo importante, faça até 3 perguntas.\n\n{REQUEST}:\n{task}",
        zh: "动笔之前，先为这篇内容写一份简报：目标、受众、语气、核心信息、格式和篇幅。如果缺少重要信息，最多提出3个问题。\n\n{REQUEST}：\n{task}",
      },
      output: { es: "Brief de una página.", en: "A one-page brief.", pt: "Briefing de uma página.", zh: "一页简报。" },
      dependsOn: [],
    },
    {
      title: { es: "Proponer la estructura", en: "Propose the structure", pt: "Propor a estrutura", zh: "拟定结构" },
      goal: {
        es: "Ordenar las secciones y la idea de cada una, todavía sin redactar.",
        en: "Order the sections and the idea of each, without drafting yet.",
        pt: "Ordenar as seções e a ideia de cada uma, ainda sem redigir.",
        zh: "排好各部分顺序及要点，暂不成文。",
      },
      prompt: {
        es: "Con este brief, proponé la estructura: secciones en orden, la idea de cada una y el gancho de apertura. Todavía sin redactar.\n\nBrief:\n{s1}",
        en: "With this brief, propose the structure: sections in order, the idea of each and the opening hook. Do not draft it yet.\n\nBrief:\n{s1}",
        pt: "Com este briefing, proponha a estrutura: seções em ordem, a ideia de cada uma e o gancho de abertura. Ainda sem redigir.\n\nBriefing:\n{s1}",
        zh: "根据这份简报拟定结构：按顺序列出各部分、每部分的要点以及开头的吸引点。先不要成文。\n\n简报：\n{s1}",
      },
      output: { es: "Esquema por secciones.", en: "A section-by-section outline.", pt: "Esboço por seções.", zh: "分部分的大纲。" },
      dependsOn: [1],
    },
    {
      title: { es: "Títulos y aperturas", en: "Titles and openers", pt: "Títulos e aberturas", zh: "标题与开头" },
      goal: {
        es: "Generar opciones de título y de primera frase, en paralelo a la estructura.",
        en: "Generate title and first-line options, in parallel with the structure.",
        pt: "Gerar opções de título e de primeira frase, em paralelo à estrutura.",
        zh: "与结构并行，产出多个标题和首句备选。",
      },
      prompt: {
        es: "Con este brief, escribí 5 opciones de título (o asunto) y 3 frases de apertura, cada una con un enfoque distinto. Indicá cuál recomendás y por qué.\n\nBrief:\n{s1}",
        en: "With this brief, write 5 title (or subject line) options and 3 opening lines, each with a different angle. Say which one you recommend and why.\n\nBrief:\n{s1}",
        pt: "Com este briefing, escreva 5 opções de título (ou assunto) e 3 frases de abertura, cada uma com um enfoque diferente. Diga qual recomenda e por quê.\n\nBriefing:\n{s1}",
        zh: "根据这份简报，写出5个标题（或邮件主题）备选和3个开头句，每个角度各不相同。说明你推荐哪一个以及理由。\n\n简报：\n{s1}",
      },
      output: { es: "Opciones de título y apertura.", en: "Title and opener options.", pt: "Opções de título e abertura.", zh: "标题与开头备选。" },
      dependsOn: [1],
    },
    {
      title: { es: "Primer borrador", en: "First draft", pt: "Primeiro rascunho", zh: "初稿" },
      goal: {
        es: "Redactar el texto completo con el brief y el esquema.",
        en: "Write the full text from the brief and the outline.",
        pt: "Redigir o texto completo com o briefing e o esboço.",
        zh: "依据简报和大纲写出全文。",
      },
      prompt: {
        es: "Redactá el texto completo siguiendo este esquema y el brief. Respetá el tono y el largo indicados.\n\nBrief:\n{s1}\n\nEsquema:\n{s2}",
        en: "Write the full text following this outline and the brief. Keep to the tone and length they set.\n\nBrief:\n{s1}\n\nOutline:\n{s2}",
        pt: "Redija o texto completo seguindo este esboço e o briefing. Respeite o tom e a extensão indicados.\n\nBriefing:\n{s1}\n\nEsboço:\n{s2}",
        zh: "按照这份大纲和简报写出全文，遵守其中规定的语气和篇幅。\n\n简报：\n{s1}\n\n大纲：\n{s2}",
      },
      output: { es: "Borrador completo.", en: "A complete draft.", pt: "Rascunho completo.", zh: "完整初稿。" },
      dependsOn: [1, 2],
    },
    {
      title: { es: "Editar y pulir", en: "Edit and polish", pt: "Editar e polir", zh: "编辑润色" },
      goal: {
        es: "Corregir, elegir el mejor título y dejar la versión final.",
        en: "Correct it, pick the best title and produce the final version.",
        pt: "Corrigir, escolher o melhor título e deixar a versão final.",
        zh: "修改文字，选定最佳标题，形成终稿。",
      },
      prompt: {
        es: "Editá este borrador: claridad, ritmo, errores y coherencia con el brief. Elegí el mejor título de la lista y devolvé la versión final lista para publicar.\n\nBorrador:\n{s4}\n\nTítulos y aperturas:\n{s3}",
        en: "Edit this draft for clarity, rhythm, mistakes and consistency with the brief. Pick the best title from the list and return the final version, ready to publish.\n\nDraft:\n{s4}\n\nTitles and openers:\n{s3}",
        pt: "Edite este rascunho: clareza, ritmo, erros e coerência com o briefing. Escolha o melhor título da lista e devolva a versão final pronta para publicar.\n\nRascunho:\n{s4}\n\nTítulos e aberturas:\n{s3}",
        zh: "请编辑这份初稿：清晰度、节奏、错误以及与简报的一致性。从列表中选出最好的标题，给出可直接发布的终稿。\n\n初稿：\n{s4}\n\n标题与开头：\n{s3}",
      },
      output: { es: "Versión final.", en: "The final version.", pt: "Versão final.", zh: "终稿。" },
      dependsOn: [3, 4],
    },
  ],
  research: [
    {
      title: { es: "Definir la pregunta", en: "Frame the question", pt: "Definir a pergunta", zh: "明确问题" },
      goal: {
        es: "Bajar el pedido a una pregunta principal, subpreguntas y qué cuenta como evidencia.",
        en: "Reduce the request to one main question, sub-questions and what counts as evidence.",
        pt: "Reduzir o pedido a uma pergunta principal, subperguntas e o que conta como evidência.",
        zh: "把需求归结为一个核心问题、若干子问题以及什么算作证据。",
      },
      prompt: {
        es: "Convertí este pedido en un plan de investigación: la pregunta principal, 3 a 5 subpreguntas, qué contaría como evidencia y qué queda fuera del alcance.\n\n{REQUEST}:\n{task}",
        en: "Turn this request into a research plan: the main question, 3 to 5 sub-questions, what would count as evidence and what is out of scope.\n\n{REQUEST}:\n{task}",
        pt: "Transforme este pedido em um plano de pesquisa: a pergunta principal, 3 a 5 subperguntas, o que contaria como evidência e o que fica fora do escopo.\n\n{REQUEST}:\n{task}",
        zh: "把这个需求整理成一份研究计划：核心问题、3到5个子问题、什么可以算作证据，以及哪些内容不在范围内。\n\n{REQUEST}：\n{task}",
      },
      output: { es: "Preguntas y alcance.", en: "Questions and scope.", pt: "Perguntas e escopo.", zh: "问题与范围。" },
      dependsOn: [],
    },
    {
      title: { es: "Reunir evidencia", en: "Gather evidence", pt: "Reunir evidências", zh: "收集证据" },
      goal: {
        es: "Juntar datos y fuentes para cada subpregunta, con fecha y origen.",
        en: "Collect data and sources for each sub-question, with date and origin.",
        pt: "Juntar dados e fontes para cada subpergunta, com data e origem.",
        zh: "为每个子问题收集数据和来源，注明日期与出处。",
      },
      prompt: {
        es: "Para cada subpregunta de este plan, buscá y resumí la evidencia disponible, con la fuente y la fecha de cada dato. Marcá lo que no pudiste confirmar.\n\nPlan:\n{s1}",
        en: "For each sub-question in this plan, find and summarize the available evidence, with the source and date of every data point. Flag what you could not confirm.\n\nPlan:\n{s1}",
        pt: "Para cada subpergunta deste plano, busque e resuma as evidências disponíveis, com a fonte e a data de cada dado. Marque o que não conseguiu confirmar.\n\nPlano:\n{s1}",
        zh: "针对这份计划中的每个子问题，查找并总结现有证据，注明每条数据的来源和日期。标出你无法确认的内容。\n\n计划：\n{s1}",
      },
      output: { es: "Evidencia con fuentes.", en: "Evidence with sources.", pt: "Evidências com fontes.", zh: "附来源的证据。" },
      dependsOn: [1],
    },
    {
      title: { es: "Fijar los criterios", en: "Set the criteria", pt: "Definir os critérios", zh: "确定评估标准" },
      goal: {
        es: "Decidir cómo se va a evaluar la evidencia, en paralelo a la búsqueda.",
        en: "Decide how the evidence will be weighed, in parallel with the search.",
        pt: "Decidir como a evidência será avaliada, em paralelo à busca.",
        zh: "与收集证据并行，决定如何评估证据。",
      },
      prompt: {
        es: "Para este plan de investigación, definí cómo vas a evaluar la evidencia: criterios, cuánto pesa cada uno y qué resultado cambiaría la conclusión.\n\nPlan:\n{s1}",
        en: "For this research plan, define how you will weigh the evidence: criteria, how much each one counts and what finding would change the conclusion.\n\nPlan:\n{s1}",
        pt: "Para este plano de pesquisa, defina como vai avaliar as evidências: critérios, quanto pesa cada um e que resultado mudaria a conclusão.\n\nPlano:\n{s1}",
        zh: "针对这份研究计划，说明你将如何评估证据：评估标准、各项权重，以及什么样的发现会改变结论。\n\n计划：\n{s1}",
      },
      output: { es: "Criterios de evaluación.", en: "Evaluation criteria.", pt: "Critérios de avaliação.", zh: "评估标准。" },
      dependsOn: [1],
    },
    {
      title: { es: "Analizar y concluir", en: "Analyze and conclude", pt: "Analisar e concluir", zh: "分析并得出结论" },
      goal: {
        es: "Responder la pregunta principal con una conclusión y su nivel de confianza.",
        en: "Answer the main question with a conclusion and how confident it is.",
        pt: "Responder à pergunta principal com uma conclusão e seu nível de confiança.",
        zh: "回答核心问题，给出结论及其可信程度。",
      },
      prompt: {
        es: "Analizá esta evidencia con estos criterios. Respondé la pregunta principal con una conclusión clara, el nivel de confianza, los puntos débiles y los próximos pasos.\n\nEvidencia:\n{s2}\n\nCriterios:\n{s3}",
        en: "Analyze this evidence with these criteria. Answer the main question with a clear conclusion, how confident you are, the weak points and the next steps.\n\nEvidence:\n{s2}\n\nCriteria:\n{s3}",
        pt: "Analise estas evidências com estes critérios. Responda à pergunta principal com uma conclusão clara, o nível de confiança, os pontos fracos e os próximos passos.\n\nEvidências:\n{s2}\n\nCritérios:\n{s3}",
        zh: "请用这些标准分析这些证据。回答核心问题，给出明确结论、可信程度、薄弱之处和后续步骤。\n\n证据：\n{s2}\n\n标准：\n{s3}",
      },
      output: { es: "Informe con conclusión.", en: "A report with a conclusion.", pt: "Relatório com conclusão.", zh: "含结论的报告。" },
      dependsOn: [2, 3],
    },
  ],
  general: [
    {
      title: { es: "Aclarar el objetivo", en: "Clarify the goal", pt: "Esclarecer o objetivo", zh: "厘清目标" },
      goal: {
        es: "Reformular la tarea en una frase y detectar lo que falta saber.",
        en: "Restate the task in one sentence and spot what is still unknown.",
        pt: "Reformular a tarefa em uma frase e identificar o que falta saber.",
        zh: "用一句话复述任务，找出尚不清楚的信息。",
      },
      prompt: {
        es: "Ayudame a aclarar esta tarea antes de resolverla: reformulá el objetivo en una frase, listá lo que necesitás saber y hacé hasta 3 preguntas si falta algo importante.\n\n{TASK}:\n{task}",
        en: "Help me clarify this task before solving it: restate the goal in one sentence, list what you need to know and ask up to 3 questions if something important is missing.\n\n{TASK}:\n{task}",
        pt: "Me ajude a esclarecer esta tarefa antes de resolvê-la: reformule o objetivo em uma frase, liste o que você precisa saber e faça até 3 perguntas se faltar algo importante.\n\n{TASK}:\n{task}",
        zh: "在动手之前，请帮我厘清这项任务：用一句话复述目标，列出你需要了解的信息，如果缺少重要内容，最多提出3个问题。\n\n{TASK}：\n{task}",
      },
      output: { es: "Objetivo claro y datos que faltan.", en: "A clear goal and the missing facts.", pt: "Objetivo claro e dados que faltam.", zh: "清晰的目标和缺失的信息。" },
      dependsOn: [],
    },
    {
      title: { es: "Planificar", en: "Plan", pt: "Planejar", zh: "制定计划" },
      goal: {
        es: "Partir el objetivo en pasos con un resultado claro cada uno.",
        en: "Break the goal into steps, each with a clear result.",
        pt: "Dividir o objetivo em passos, cada um com um resultado claro.",
        zh: "把目标拆成若干步骤，每一步都有明确产出。",
      },
      prompt: {
        es: "Con este objetivo, proponé un plan en pasos numerados: qué produce cada paso y cómo vamos a saber que quedó bien.\n\nObjetivo:\n{s1}",
        en: "With this goal, propose a plan in numbered steps: what each step produces and how we will know it is done well.\n\nGoal:\n{s1}",
        pt: "Com este objetivo, proponha um plano em passos numerados: o que cada passo produz e como vamos saber que ficou bom.\n\nObjetivo:\n{s1}",
        zh: "根据这个目标，提出一个分步编号的计划：每一步产出什么，以及如何判断它完成得好。\n\n目标：\n{s1}",
      },
      output: { es: "Plan en pasos.", en: "A step-by-step plan.", pt: "Plano em passos.", zh: "分步计划。" },
      dependsOn: [1],
    },
    {
      title: { es: "Armar la lista de control", en: "Write the checklist", pt: "Montar a lista de verificação", zh: "制定检查清单" },
      goal: {
        es: "Definir cómo se ve un buen resultado, en paralelo al plan.",
        en: "Define what a good result looks like, in parallel with the plan.",
        pt: "Definir como é um bom resultado, em paralelo ao plano.",
        zh: "与计划并行，先定义好结果应该是什么样子。",
      },
      prompt: {
        es: "Con este objetivo, escribí una lista de control de 5 a 8 criterios concretos y verificables para saber si el resultado final está bien. Sin resolver la tarea.\n\nObjetivo:\n{s1}",
        en: "With this goal, write a checklist of 5 to 8 concrete, checkable criteria that tell whether the final result is good. Do not do the task itself.\n\nGoal:\n{s1}",
        pt: "Com este objetivo, escreva uma lista de verificação de 5 a 8 critérios concretos e verificáveis para saber se o resultado final está bom. Sem resolver a tarefa.\n\nObjetivo:\n{s1}",
        zh: "根据这个目标，列出5到8条具体、可检验的标准，用来判断最终结果是否合格。先不要完成任务本身。\n\n目标：\n{s1}",
      },
      output: { es: "Lista de control.", en: "A checklist.", pt: "Lista de verificação.", zh: "检查清单。" },
      dependsOn: [1],
    },
    {
      title: { es: "Resolver", en: "Do it", pt: "Resolver", zh: "执行" },
      goal: {
        es: "Seguir el plan y entregar el resultado completo.",
        en: "Follow the plan and deliver the complete result.",
        pt: "Seguir o plano e entregar o resultado completo.",
        zh: "按计划执行，交付完整结果。",
      },
      prompt: {
        es: "Seguí este plan y resolvé la tarea completa. Mostrá primero el resultado final y después las notas o supuestos.\n\nPlan:\n{s2}",
        en: "Follow this plan and complete the task. Show the final result first, then any notes or assumptions.\n\nPlan:\n{s2}",
        pt: "Siga este plano e resolva a tarefa completa. Mostre primeiro o resultado final e depois as notas ou premissas.\n\nPlano:\n{s2}",
        zh: "请按照这个计划完成整项任务。先给出最终结果，再列出备注或前提假设。\n\n计划：\n{s2}",
      },
      output: { es: "Resultado completo.", en: "The complete result.", pt: "Resultado completo.", zh: "完整结果。" },
      dependsOn: [2],
    },
    {
      title: { es: "Revisar", en: "Review", pt: "Revisar", zh: "复查" },
      goal: {
        es: "Comparar el resultado con la lista de control y corregirlo.",
        en: "Check the result against the checklist and fix it.",
        pt: "Comparar o resultado com a lista de verificação e corrigi-lo.",
        zh: "对照检查清单检查结果并修正。",
      },
      prompt: {
        es: "Revisá este resultado contra la lista de control, criterio por criterio: marcá lo que cumple y lo que no, y devolvé una versión final corregida.\n\nLista de control:\n{s3}\n\nResultado:\n{s4}",
        en: "Check this result against the checklist, criterion by criterion: mark what passes and what does not, and return a corrected final version.\n\nChecklist:\n{s3}\n\nResult:\n{s4}",
        pt: "Revise este resultado em relação à lista de verificação, critério por critério: marque o que atende e o que não atende, e devolva uma versão final corrigida.\n\nLista de verificação:\n{s3}\n\nResultado:\n{s4}",
        zh: "请逐条对照检查清单检查这个结果：标出哪些符合、哪些不符合，然后给出修正后的最终版本。\n\n检查清单：\n{s3}\n\n结果：\n{s4}",
      },
      output: { es: "Versión final corregida.", en: "A corrected final version.", pt: "Versão final corrigida.", zh: "修正后的终稿。" },
      dependsOn: [3, 4],
    },
  ],
};

function fill(template: string, lang: Lang, task: string): string {
  return template
    .replace("{TASK}", TASK[lang])
    .replace("{REQUEST}", REQUEST[lang])
    .replace(/\{s(\d)\}/g, (_m, n: string) => stepPlaceholder(lang, Number(n)))
    .replace("{task}", task);
}

export function basicSummary(lang: Lang, family: BasicFamily, steps: number): string {
  const kind: Record<BasicFamily, L> = {
    code: { es: "de programación", en: "coding", pt: "de programação", zh: "编程" },
    writing: { es: "de escritura", en: "writing", pt: "de escrita", zh: "写作" },
    research: { es: "de investigación", en: "research", pt: "de pesquisa", zh: "研究" },
    general: { es: "general", en: "general", pt: "geral", zh: "通用" },
  };
  const k = kind[family][lang];
  switch (lang) {
    case "es":
      return `Plan básico de ${steps} pasos para una tarea ${k}, armado por el motor de Promptea sin IA.`;
    case "pt":
      return `Plano básico de ${steps} etapas para uma tarefa ${k}, montado pelo motor do Promptea sem IA.`;
    case "zh":
      return `由Promptea引擎（未使用AI）为这项${k}任务生成的${steps}步基础方案。`;
    default:
      return `A basic ${steps}-step plan for a ${k} task, built by Promptea's engine without AI.`;
  }
}

/** The basic flow drafts for a task (the main task goes verbatim into step 1). */
export function basicDrafts(task: string, lang: Lang, family: BasicFamily): FlowStepDraft[] {
  return TEMPLATES[family].map((step) => ({
    title: step.title[lang],
    goal: step.goal[lang],
    prompt: fill(step.prompt[lang], lang, task.trim()),
    output: step.output[lang],
    dependsOn: [...step.dependsOn],
  }));
}
