import type { Lang, TaskType } from "../promptTemplates";
import type { Features, Finding } from "./types";

export function buildFindings(core: string, task: TaskType, lang: Lang, f: Features): Finding[] {
  const es = lang === "es";
  const findings: Finding[] = [];
  const add = (x: Finding) => findings.push(x);

  if (f.injectionLike) {
    add({
      id: "prompt_injection",
      title: es ? "Posible prompt injection" : "Possible prompt injection",
      description: es
        ? "Hay frases típicas para forzar al modelo a ignorar instrucciones o salirse del pedido real."
        : "There are phrases commonly used to force the model to ignore instructions or derail the request.",
      fix: es
        ? "Eliminá esas frases y dejá claro tu objetivo real. Separá instrucciones de contenido."
        : "Remove those phrases and clarify your real goal. Separate instructions from content.",
      severity: "high",
    });
  }

  if (f.words < 10) {
    add({
      id: "too_short",
      title: es ? "Prompt demasiado corto" : "Prompt is too short",
      description: es ? "Con tan poca info, la IA completa con suposiciones y baja la precisión." : "With so little detail, the AI will guess more and accuracy drops.",
      fix: es ? "Sumá objetivo + contexto mínimo + formato de salida." : "Add a goal + minimal context + output format.",
      severity: f.words < 5 ? "high" : "medium",
    });
  }

  if (!f.hasGoal) {
    add({
      id: "missing_goal",
      title: es ? "Falta el objetivo" : "Missing goal",
      description: es ? "No queda claro qué querés lograr concretamente." : "It’s not clear what you want to achieve.",
      fix: es ? "Agregá una frase: “Quiero lograr X”." : 'Add a line: "My goal is X."',
      severity: "high",
    });
  }

  if (!f.hasInputs) {
    add({
      id: "missing_inputs",
      title: es ? "Faltan datos de entrada" : "Missing input data",
      description: es ? "No se ve con qué información debe trabajar la IA." : "It’s unclear what information the AI should work with.",
      fix: es ? "Pegá los datos / texto / ejemplos con los que debe operar." : "Paste the data/text/examples it should use.",
      severity: "medium",
    });
  }

  if (!f.hasOutputFormat) {
    add({
      id: "missing_output_format",
      title: es ? "No definiste el formato de salida" : "No output format specified",
      description: es
        ? "Si no pedís un formato, la respuesta puede salir desordenada o no servirte."
        : "Without a requested format, the answer may be messy or unusable.",
      fix: es ? "Pedí viñetas / pasos / tabla / JSON (lo que te sirva)." : "Ask for bullets / steps / table / JSON (whatever you need).",
      severity: "high",
    });
  }

  if (!f.hasConstraints) {
    add({
      id: "missing_constraints",
      title: es ? "Faltan restricciones" : "Missing constraints",
      description: es
        ? "Sin límites (tono, largo, qué evitar), la respuesta puede variar demasiado."
        : "Without limits (tone, length, what to avoid), answers can vary too much.",
      fix: es ? "Indicá tono, longitud, cosas a evitar y supuestos permitidos." : "State tone, length, what to avoid, and allowed assumptions.",
      severity: "medium",
    });
  }

  if (!f.hasSuccessCriteria) {
    add({
      id: "missing_success_criteria",
      title: es ? "Faltan criterios para evaluar" : "Missing success criteria",
      description: es ? "Sin criterios, es difícil saber si la respuesta “está bien”." : "Without criteria, it’s hard to judge if the answer is “good”.",
      fix: es ? "Agregá 2–3 criterios: qué tiene que incluir / evitar." : "Add 2–3 criteria: what it must include/avoid.",
      severity: "low",
    });
  }

  if (f.contradictions) {
    add({
      id: "contradiction",
      title: es ? "Instrucciones contradictorias" : "Contradictory instructions",
      description: es ? "Hay pedidos que se pisan (por ejemplo: “breve” y “muy detallado”)." : 'Some instructions conflict (e.g., "brief" and "very detailed").',
      fix: es ? "Elegí una prioridad (breve o profundo). Podés pedir: “breve, y ampliá si hace falta”." : 'Choose a priority. You can ask: "brief, expand if needed".',
      severity: "medium",
    });
  }

  if (f.languageMismatch) {
    add({
      id: "language_mismatch",
      title: es ? "Idioma mezclado" : "Mixed language",
      description: es ? "El prompt parece estar más en inglés que la interfaz, o viceversa." : "The prompt language seems different from the interface language.",
      fix: es ? "Unificá idioma (o pedí explícitamente el idioma de salida)." : "Unify language (or explicitly request output language).",
      severity: "low",
    });
  }

  if (task === "debugging") {
    if (!f.hasErrorDetails) {
      add({
        id: "debug_missing_error",
        title: es ? "Falta el error exacto" : "Missing exact error",
        description: es ? "Para debuggear, necesitás el mensaje de error o el síntoma concreto." : "For debugging, you need the exact error message or concrete symptom.",
        fix: es ? "Pegá el mensaje de error / stack trace / logs relevantes." : "Paste the error message / stack trace / relevant logs.",
        severity: "high",
      });
    }
    if (!f.hasReproSteps) {
      add({
        id: "debug_missing_repro",
        title: es ? "Faltan pasos para reproducir" : "Missing repro steps",
        description: es ? "Sin pasos para reproducir, es fácil que el diagnóstico sea incorrecto." : "Without repro steps, the diagnosis can easily be wrong.",
        fix: es ? "Agregá 2–4 pasos: qué hacés y qué pasa." : "Add 2–4 steps: what you do and what happens.",
        severity: "medium",
      });
    }
  }

  if (task === "research") {
    if (!f.hasTimeframe) {
      add({
        id: "research_missing_timeframe",
        title: es ? "Falta el período" : "Missing timeframe",
        description: es ? "La respuesta cambia mucho según qué tan reciente deba ser." : "The answer changes a lot depending on recency.",
        fix: es ? "Indicá un rango o “últimos X meses/años”." : 'Specify a range or "last X months/years".',
        severity: "low",
      });
    }
    if (!f.hasRegion) {
      add({
        id: "research_missing_region",
        title: es ? "Falta región/mercado" : "Missing region/market",
        description: es ? "En research, el contexto geográfico puede cambiar conclusiones." : "In research, geography can change conclusions.",
        fix: es ? "Aclarás país/región si aplica." : "State country/region if relevant.",
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
        title: es ? "Faltan campos / esquema" : "Missing fields/schema",
        description: es ? "Para extracción, necesitás decir qué campos querés y cómo devolverlos." : "For extraction, specify the fields you want and how to return them.",
        fix: es ? "Listá campos requeridos + ejemplo de JSON." : "List required fields + a JSON example.",
        severity: "high",
      });
    }
  }

  return findings;
}