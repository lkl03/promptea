import type { Lang, TaskType } from "../promptTemplates";
import type { Features, Finding } from "./types";
import { pick } from "@/lib/domain";

export function buildFindings(core: string, task: TaskType, lang: Lang, f: Features): Finding[] {
  const findings: Finding[] = [];
  const add = (x: Finding) => findings.push(x);

  if (f.injectionLike) {
    add({
      id: "prompt_injection",
      title: pick(lang, { es: "Posible prompt injection", en: "Possible prompt injection", pt: "Possível injeção de prompt", zh: "可能存在提示词注入" }),
      description: pick(lang, {
        es: "Hay frases típicas para forzar al modelo a ignorar instrucciones o salirse del pedido real.",
        en: "There are phrases commonly used to force the model to ignore instructions or derail the request.",
        pt: "Há frases normalmente usadas para forçar o modelo a ignorar instruções ou desviar o pedido.",
        zh: "其中有常被用来迫使模型忽略指令、偏离原本请求的语句。",
      }),
      fix: pick(lang, {
        es: "Eliminá esas frases y dejá claro tu objetivo real. Separá instrucciones de contenido.",
        en: "Remove those phrases and clarify your real goal. Separate instructions from content.",
        pt: "Remova essas frases e deixe claro o seu objetivo real. Separe as instruções do conteúdo.",
        zh: "删掉这些语句，说清你的真实目标。把指令和内容分开。",
      }),
      severity: "high",
    });
  }

  if (f.words < 10) {
    add({
      id: "too_short",
      title: pick(lang, { es: "Prompt demasiado corto", en: "Prompt is too short", pt: "O prompt é curto demais", zh: "提示词太短" }),
      description: pick(lang, {
        es: "Con tan poca info, la IA completa con suposiciones y baja la precisión.",
        en: "With so little detail, the AI will guess more and accuracy drops.",
        pt: "Com tão pouco detalhe, a IA vai adivinhar mais e a precisão cai.",
        zh: "细节这么少，AI只能更多地靠猜，准确度会下降。",
      }),
      fix: pick(lang, {
        es: "Sumá objetivo + contexto mínimo + formato de salida.",
        en: "Add a goal + minimal context + output format.",
        pt: "Adicione um objetivo + contexto mínimo + formato de saída.",
        zh: "补充目标、必要的背景和输出格式。",
      }),
      severity: f.words < 5 ? "high" : "medium",
    });
  }

  if (!f.hasGoal) {
    add({
      id: "missing_goal",
      title: pick(lang, { es: "Falta el objetivo", en: "Missing goal", pt: "Falta o objetivo", zh: "缺少目标" }),
      description: pick(lang, {
        es: "No queda claro qué querés lograr concretamente.",
        en: "It’s not clear what you want to achieve.",
        pt: "Não está claro o que você quer alcançar.",
        zh: "看不出你具体想达成什么。",
      }),
      fix: pick(lang, {
        es: "Agregá una frase: “Quiero lograr X”.",
        en: 'Add a line: "My goal is X."',
        pt: 'Adicione uma linha: "Meu objetivo é X."',
        zh: "加上一句：“我的目标是X。”",
      }),
      severity: "high",
    });
  }

  if (!f.hasInputs) {
    add({
      id: "missing_inputs",
      title: pick(lang, { es: "Faltan datos de entrada", en: "Missing input data", pt: "Faltam os dados de entrada", zh: "缺少输入数据" }),
      description: pick(lang, {
        es: "No se ve con qué información debe trabajar la IA.",
        en: "It’s unclear what information the AI should work with.",
        pt: "Não está claro com que informação a IA deve trabalhar.",
        zh: "不清楚AI应该基于哪些信息来完成任务。",
      }),
      fix: pick(lang, {
        es: "Pegá los datos / texto / ejemplos con los que debe operar.",
        en: "Paste the data/text/examples it should use.",
        pt: "Cole os dados/o texto/os exemplos que ela deve usar.",
        zh: "粘贴它要用到的数据/文本/示例。",
      }),
      severity: "medium",
    });
  }

  if (!f.hasOutputFormat) {
    add({
      id: "missing_output_format",
      title: pick(lang, {
        es: "No definiste el formato de salida",
        en: "No output format specified",
        pt: "Nenhum formato de saída definido",
        zh: "未指定输出格式",
      }),
      description: pick(lang, {
        es: "Si no pedís un formato, la respuesta puede salir desordenada o no servirte.",
        en: "Without a requested format, the answer may be messy or unusable.",
        pt: "Sem um formato pedido, a resposta pode sair bagunçada ou inutilizável.",
        zh: "不指定格式，回答可能会杂乱无章，或者没法直接用。",
      }),
      fix: pick(lang, {
        es: "Pedí viñetas / pasos / tabla / JSON (lo que te sirva).",
        en: "Ask for bullets / steps / table / JSON (whatever you need).",
        pt: "Peça tópicos / passos / tabela / JSON (o que você precisar).",
        zh: "指定要点、步骤、表格或JSON（按你的需要）。",
      }),
      severity: "high",
    });
  }

  if (!f.hasConstraints) {
    add({
      id: "missing_constraints",
      title: pick(lang, { es: "Faltan restricciones", en: "Missing constraints", pt: "Faltam restrições", zh: "缺少约束条件" }),
      description: pick(lang, {
        es: "Sin límites (tono, largo, qué evitar), la respuesta puede variar demasiado.",
        en: "Without limits (tone, length, what to avoid), answers can vary too much.",
        pt: "Sem limites (tom, tamanho, o que evitar), as respostas podem variar demais.",
        zh: "没有限制（语气、篇幅、要避免的内容），回答可能差异很大。",
      }),
      fix: pick(lang, {
        es: "Indicá tono, longitud, cosas a evitar y supuestos permitidos.",
        en: "State tone, length, what to avoid, and allowed assumptions.",
        pt: "Informe tom, tamanho, o que evitar e as suposições permitidas.",
        zh: "说明语气、篇幅、要避免的内容，以及允许做哪些假设。",
      }),
      severity: "medium",
    });
  }

  if (!f.hasSuccessCriteria) {
    add({
      id: "missing_success_criteria",
      title: pick(lang, { es: "Faltan criterios para evaluar", en: "Missing success criteria", pt: "Faltam critérios de sucesso", zh: "缺少成功标准" }),
      description: pick(lang, {
        es: "Sin criterios, es difícil saber si la respuesta “está bien”.",
        en: "Without criteria, it’s hard to judge if the answer is “good”.",
        pt: "Sem critérios, é difícil avaliar se a resposta é “boa”.",
        zh: "没有标准，就很难判断回答是否“合格”。",
      }),
      fix: pick(lang, {
        es: "Agregá 2–3 criterios: qué tiene que incluir / evitar.",
        en: "Add 2–3 criteria: what it must include/avoid.",
        pt: "Adicione 2 ou 3 critérios: o que ela deve incluir/evitar.",
        zh: "补充2–3条标准：必须包含/避免什么。",
      }),
      severity: "low",
    });
  }

  if (f.contradictions) {
    add({
      id: "contradiction",
      title: pick(lang, { es: "Instrucciones contradictorias", en: "Contradictory instructions", pt: "Instruções contraditórias", zh: "指令相互矛盾" }),
      description: pick(lang, {
        es: "Hay pedidos que se pisan (por ejemplo: “breve” y “muy detallado”).",
        en: 'Some instructions conflict (e.g., "brief" and "very detailed").',
        pt: 'Algumas instruções entram em conflito (ex.: "breve" e "muito detalhado").',
        zh: "有些指令相互冲突（例如“简短”和“非常详细”）。",
      }),
      fix: pick(lang, {
        es: "Elegí una prioridad (breve o profundo). Podés pedir: “breve, y ampliá si hace falta”.",
        en: 'Choose a priority. You can ask: "brief, expand if needed".',
        pt: 'Escolha uma prioridade. Você pode pedir: "breve, e expanda se for preciso".',
        zh: "选定一个优先级。可以这样写：“简短，必要时再展开”。",
      }),
      severity: "medium",
    });
  }

  if (f.languageMismatch) {
    add({
      id: "language_mismatch",
      title: pick(lang, { es: "Idioma mezclado", en: "Mixed language", pt: "Idiomas misturados", zh: "语言混杂" }),
      description: pick(lang, {
        es: "El prompt parece estar más en inglés que la interfaz, o viceversa.",
        en: "The prompt language seems different from the interface language.",
        pt: "O idioma do prompt parece diferente do idioma da interface.",
        zh: "提示词的语言似乎和界面语言不一致。",
      }),
      fix: pick(lang, {
        es: "Unificá idioma (o pedí explícitamente el idioma de salida).",
        en: "Unify language (or explicitly request output language).",
        pt: "Unifique o idioma (ou peça explicitamente o idioma da saída).",
        zh: "统一语言（或明确指定输出语言）。",
      }),
      severity: "low",
    });
  }

  if (task === "debugging") {
    if (!f.hasErrorDetails) {
      add({
        id: "debug_missing_error",
        title: pick(lang, { es: "Falta el error exacto", en: "Missing exact error", pt: "Falta o erro exato", zh: "缺少确切的错误信息" }),
        description: pick(lang, {
          es: "Para debuggear, necesitás el mensaje de error o el síntoma concreto.",
          en: "For debugging, you need the exact error message or concrete symptom.",
          pt: "Para depurar, é preciso a mensagem de erro exata ou um sintoma concreto.",
          zh: "调试需要确切的错误信息或具体的症状。",
        }),
        fix: pick(lang, {
          es: "Pegá el mensaje de error / stack trace / logs relevantes.",
          en: "Paste the error message / stack trace / relevant logs.",
          pt: "Cole a mensagem de erro / o stack trace / os logs relevantes.",
          zh: "粘贴错误信息/stack trace/相关日志。",
        }),
        severity: "high",
      });
    }
    if (!f.hasReproSteps) {
      add({
        id: "debug_missing_repro",
        title: pick(lang, { es: "Faltan pasos para reproducir", en: "Missing repro steps", pt: "Faltam os passos para reproduzir", zh: "缺少复现步骤" }),
        description: pick(lang, {
          es: "Sin pasos para reproducir, es fácil que el diagnóstico sea incorrecto.",
          en: "Without repro steps, the diagnosis can easily be wrong.",
          pt: "Sem os passos para reproduzir, o diagnóstico pode sair errado com facilidade.",
          zh: "没有复现步骤，诊断很容易出错。",
        }),
        fix: pick(lang, {
          es: "Agregá 2–4 pasos: qué hacés y qué pasa.",
          en: "Add 2–4 steps: what you do and what happens.",
          pt: "Adicione de 2 a 4 passos: o que você faz e o que acontece.",
          zh: "补充2–4个步骤：你做了什么，结果发生了什么。",
        }),
        severity: "medium",
      });
    }
  }

  if (task === "research") {
    if (!f.hasTimeframe) {
      add({
        id: "research_missing_timeframe",
        title: pick(lang, { es: "Falta el período", en: "Missing timeframe", pt: "Falta o período", zh: "缺少时间范围" }),
        description: pick(lang, {
          es: "La respuesta cambia mucho según qué tan reciente deba ser.",
          en: "The answer changes a lot depending on recency.",
          pt: "A resposta muda muito dependendo de quão recente é a informação.",
          zh: "信息要多新，会极大地影响回答。",
        }),
        fix: pick(lang, {
          es: "Indicá un rango o “últimos X meses/años”.",
          en: 'Specify a range or "last X months/years".',
          pt: 'Especifique um intervalo ou "últimos X meses/anos".',
          zh: "指定一个时间范围，或写明“最近X个月/年”。",
        }),
        severity: "low",
      });
    }
    if (!f.hasRegion) {
      add({
        id: "research_missing_region",
        title: pick(lang, { es: "Falta región/mercado", en: "Missing region/market", pt: "Falta a região/o mercado", zh: "缺少地区/市场" }),
        description: pick(lang, {
          es: "En research, el contexto geográfico puede cambiar conclusiones.",
          en: "In research, geography can change conclusions.",
          pt: "Em pesquisa, a geografia pode mudar as conclusões.",
          zh: "做研究时，地域可能会改变结论。",
        }),
        fix: pick(lang, {
          es: "Aclarás país/región si aplica.",
          en: "State country/region if relevant.",
          pt: "Informe o país/a região, se for relevante.",
          zh: "如果相关，写明国家/地区。",
        }),
        severity: "low",
      });
    }
  }

  if (task === "data_extraction") {
    const tt = core.toLowerCase();
    const hasSchema = /(schema|esquema|campos|required|obligatorio)/.test(tt);
    if (!hasSchema) {
      add({
        id: "extract_missing_schema",
        title: pick(lang, { es: "Faltan campos / esquema", en: "Missing fields/schema", pt: "Faltam os campos/o esquema", zh: "缺少字段/数据结构" }),
        description: pick(lang, {
          es: "Para extracción, necesitás decir qué campos querés y cómo devolverlos.",
          en: "For extraction, specify the fields you want and how to return them.",
          pt: "Para extração, especifique os campos que você quer e como devolvê-los.",
          zh: "做数据提取时，要说明需要哪些字段，以及如何返回。",
        }),
        fix: pick(lang, {
          es: "Listá campos requeridos + ejemplo de JSON.",
          en: "List required fields + a JSON example.",
          pt: "Liste os campos obrigatórios + um exemplo em JSON.",
          zh: "列出必填字段，并附一个JSON示例。",
        }),
        severity: "high",
      });
    }
  }

  return findings;
}
