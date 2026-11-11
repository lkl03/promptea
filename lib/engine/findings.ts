import type { Lang, TaskType } from "../promptTemplates";
import type { Features, Finding } from "./types";
import { pick } from "@/lib/domain";

export function buildFindings(core: string, task: TaskType, lang: Lang, f: Features): Finding[] {
  const findings: Finding[] = [];
  const add = (x: Finding) => findings.push(x);

  if (f.injectionLike) {
    add({
      id: "prompt_injection",
      title: pick(lang, { es: "Posible prompt injection", en: "Possible prompt injection", pt: "Possível injeção de prompt" }),
      description: pick(lang, {
        es: "Hay frases típicas para forzar al modelo a ignorar instrucciones o salirse del pedido real.",
        en: "There are phrases commonly used to force the model to ignore instructions or derail the request.",
        pt: "Há frases normalmente usadas para forçar o modelo a ignorar instruções ou desviar o pedido.",
      }),
      fix: pick(lang, {
        es: "Eliminá esas frases y dejá claro tu objetivo real. Separá instrucciones de contenido.",
        en: "Remove those phrases and clarify your real goal. Separate instructions from content.",
        pt: "Remova essas frases e deixe claro o seu objetivo real. Separe as instruções do conteúdo.",
      }),
      severity: "high",
    });
  }

  if (f.words < 10) {
    add({
      id: "too_short",
      title: pick(lang, { es: "Prompt demasiado corto", en: "Prompt is too short", pt: "O prompt é curto demais" }),
      description: pick(lang, {
        es: "Con tan poca info, la IA completa con suposiciones y baja la precisión.",
        en: "With so little detail, the AI will guess more and accuracy drops.",
        pt: "Com tão pouco detalhe, a IA vai adivinhar mais e a precisão cai.",
      }),
      fix: pick(lang, {
        es: "Sumá objetivo + contexto mínimo + formato de salida.",
        en: "Add a goal + minimal context + output format.",
        pt: "Adicione um objetivo + contexto mínimo + formato de saída.",
      }),
      severity: f.words < 5 ? "high" : "medium",
    });
  }

  if (!f.hasGoal) {
    add({
      id: "missing_goal",
      title: pick(lang, { es: "Falta el objetivo", en: "Missing goal", pt: "Falta o objetivo" }),
      description: pick(lang, {
        es: "No queda claro qué querés lograr concretamente.",
        en: "It’s not clear what you want to achieve.",
        pt: "Não está claro o que você quer alcançar.",
      }),
      fix: pick(lang, {
        es: "Agregá una frase: “Quiero lograr X”.",
        en: 'Add a line: "My goal is X."',
        pt: 'Adicione uma linha: "Meu objetivo é X."',
      }),
      severity: "high",
    });
  }

  if (!f.hasInputs) {
    add({
      id: "missing_inputs",
      title: pick(lang, { es: "Faltan datos de entrada", en: "Missing input data", pt: "Faltam os dados de entrada" }),
      description: pick(lang, {
        es: "No se ve con qué información debe trabajar la IA.",
        en: "It’s unclear what information the AI should work with.",
        pt: "Não está claro com que informação a IA deve trabalhar.",
      }),
      fix: pick(lang, {
        es: "Pegá los datos / texto / ejemplos con los que debe operar.",
        en: "Paste the data/text/examples it should use.",
        pt: "Cole os dados/o texto/os exemplos que ela deve usar.",
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
      }),
      description: pick(lang, {
        es: "Si no pedís un formato, la respuesta puede salir desordenada o no servirte.",
        en: "Without a requested format, the answer may be messy or unusable.",
        pt: "Sem um formato pedido, a resposta pode sair bagunçada ou inutilizável.",
      }),
      fix: pick(lang, {
        es: "Pedí viñetas / pasos / tabla / JSON (lo que te sirva).",
        en: "Ask for bullets / steps / table / JSON (whatever you need).",
        pt: "Peça tópicos / passos / tabela / JSON (o que você precisar).",
      }),
      severity: "high",
    });
  }

  if (!f.hasConstraints) {
    add({
      id: "missing_constraints",
      title: pick(lang, { es: "Faltan restricciones", en: "Missing constraints", pt: "Faltam restrições" }),
      description: pick(lang, {
        es: "Sin límites (tono, largo, qué evitar), la respuesta puede variar demasiado.",
        en: "Without limits (tone, length, what to avoid), answers can vary too much.",
        pt: "Sem limites (tom, tamanho, o que evitar), as respostas podem variar demais.",
      }),
      fix: pick(lang, {
        es: "Indicá tono, longitud, cosas a evitar y supuestos permitidos.",
        en: "State tone, length, what to avoid, and allowed assumptions.",
        pt: "Informe tom, tamanho, o que evitar e as suposições permitidas.",
      }),
      severity: "medium",
    });
  }

  if (!f.hasSuccessCriteria) {
    add({
      id: "missing_success_criteria",
      title: pick(lang, { es: "Faltan criterios para evaluar", en: "Missing success criteria", pt: "Faltam critérios de sucesso" }),
      description: pick(lang, {
        es: "Sin criterios, es difícil saber si la respuesta “está bien”.",
        en: "Without criteria, it’s hard to judge if the answer is “good”.",
        pt: "Sem critérios, é difícil avaliar se a resposta é “boa”.",
      }),
      fix: pick(lang, {
        es: "Agregá 2–3 criterios: qué tiene que incluir / evitar.",
        en: "Add 2–3 criteria: what it must include/avoid.",
        pt: "Adicione 2 ou 3 critérios: o que ela deve incluir/evitar.",
      }),
      severity: "low",
    });
  }

  if (f.contradictions) {
    add({
      id: "contradiction",
      title: pick(lang, { es: "Instrucciones contradictorias", en: "Contradictory instructions", pt: "Instruções contraditórias" }),
      description: pick(lang, {
        es: "Hay pedidos que se pisan (por ejemplo: “breve” y “muy detallado”).",
        en: 'Some instructions conflict (e.g., "brief" and "very detailed").',
        pt: 'Algumas instruções entram em conflito (ex.: "breve" e "muito detalhado").',
      }),
      fix: pick(lang, {
        es: "Elegí una prioridad (breve o profundo). Podés pedir: “breve, y ampliá si hace falta”.",
        en: 'Choose a priority. You can ask: "brief, expand if needed".',
        pt: 'Escolha uma prioridade. Você pode pedir: "breve, e expanda se for preciso".',
      }),
      severity: "medium",
    });
  }

  if (f.languageMismatch) {
    add({
      id: "language_mismatch",
      title: pick(lang, { es: "Idioma mezclado", en: "Mixed language", pt: "Idiomas misturados" }),
      description: pick(lang, {
        es: "El prompt parece estar más en inglés que la interfaz, o viceversa.",
        en: "The prompt language seems different from the interface language.",
        pt: "O idioma do prompt parece diferente do idioma da interface.",
      }),
      fix: pick(lang, {
        es: "Unificá idioma (o pedí explícitamente el idioma de salida).",
        en: "Unify language (or explicitly request output language).",
        pt: "Unifique o idioma (ou peça explicitamente o idioma da saída).",
      }),
      severity: "low",
    });
  }

  if (task === "debugging") {
    if (!f.hasErrorDetails) {
      add({
        id: "debug_missing_error",
        title: pick(lang, { es: "Falta el error exacto", en: "Missing exact error", pt: "Falta o erro exato" }),
        description: pick(lang, {
          es: "Para debuggear, necesitás el mensaje de error o el síntoma concreto.",
          en: "For debugging, you need the exact error message or concrete symptom.",
          pt: "Para depurar, é preciso a mensagem de erro exata ou um sintoma concreto.",
        }),
        fix: pick(lang, {
          es: "Pegá el mensaje de error / stack trace / logs relevantes.",
          en: "Paste the error message / stack trace / relevant logs.",
          pt: "Cole a mensagem de erro / o stack trace / os logs relevantes.",
        }),
        severity: "high",
      });
    }
    if (!f.hasReproSteps) {
      add({
        id: "debug_missing_repro",
        title: pick(lang, { es: "Faltan pasos para reproducir", en: "Missing repro steps", pt: "Faltam os passos para reproduzir" }),
        description: pick(lang, {
          es: "Sin pasos para reproducir, es fácil que el diagnóstico sea incorrecto.",
          en: "Without repro steps, the diagnosis can easily be wrong.",
          pt: "Sem os passos para reproduzir, o diagnóstico pode sair errado com facilidade.",
        }),
        fix: pick(lang, {
          es: "Agregá 2–4 pasos: qué hacés y qué pasa.",
          en: "Add 2–4 steps: what you do and what happens.",
          pt: "Adicione de 2 a 4 passos: o que você faz e o que acontece.",
        }),
        severity: "medium",
      });
    }
  }

  if (task === "research") {
    if (!f.hasTimeframe) {
      add({
        id: "research_missing_timeframe",
        title: pick(lang, { es: "Falta el período", en: "Missing timeframe", pt: "Falta o período" }),
        description: pick(lang, {
          es: "La respuesta cambia mucho según qué tan reciente deba ser.",
          en: "The answer changes a lot depending on recency.",
          pt: "A resposta muda muito dependendo de quão recente é a informação.",
        }),
        fix: pick(lang, {
          es: "Indicá un rango o “últimos X meses/años”.",
          en: 'Specify a range or "last X months/years".',
          pt: 'Especifique um intervalo ou "últimos X meses/anos".',
        }),
        severity: "low",
      });
    }
    if (!f.hasRegion) {
      add({
        id: "research_missing_region",
        title: pick(lang, { es: "Falta región/mercado", en: "Missing region/market", pt: "Falta a região/o mercado" }),
        description: pick(lang, {
          es: "En research, el contexto geográfico puede cambiar conclusiones.",
          en: "In research, geography can change conclusions.",
          pt: "Em pesquisa, a geografia pode mudar as conclusões.",
        }),
        fix: pick(lang, {
          es: "Aclarás país/región si aplica.",
          en: "State country/region if relevant.",
          pt: "Informe o país/a região, se for relevante.",
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
        title: pick(lang, { es: "Faltan campos / esquema", en: "Missing fields/schema", pt: "Faltam os campos/o esquema" }),
        description: pick(lang, {
          es: "Para extracción, necesitás decir qué campos querés y cómo devolverlos.",
          en: "For extraction, specify the fields you want and how to return them.",
          pt: "Para extração, especifique os campos que você quer e como devolvê-los.",
        }),
        fix: pick(lang, {
          es: "Listá campos requeridos + ejemplo de JSON.",
          en: "List required fields + a JSON example.",
          pt: "Liste os campos obrigatórios + um exemplo em JSON.",
        }),
        severity: "high",
      });
    }
  }

  return findings;
}