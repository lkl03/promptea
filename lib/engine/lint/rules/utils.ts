import type { Lang, OutputFormat } from "../types";

export function includesAny(low: string, list: string[]) {
  return list.some((x) => low.includes(x));
}

export function hasNumberedSteps(p: string) {
  const matches = p.match(/^\s*\d+\s*[\).\:-]\s+/gm) ?? [];
  return matches.length >= 2;
}

export function hasErrorSnippet(p: string) {
  const low = p.toLowerCase();
  return (
    low.includes("error") ||
    low.includes("exception") ||
    low.includes("traceback") ||
    low.includes("stacktrace") ||
    /\b(typeerror|referenceerror|syntaxerror)\b/i.test(p) ||
    /```[\s\S]*?```/.test(p)
  );
}

export function hasEnvironmentHints(p: string) {
  const low = p.toLowerCase();
  return (
    includesAny(low, [
      "node",
      "npm",
      "pnpm",
      "yarn",
      "python",
      "java",
      "go",
      "rust",
      "next",
      "react",
      "typescript",
      "ts",
      "os",
      "windows",
      "mac",
      "linux",
      "docker",
      "version",
      "v0.",
      "v1.",
      "v2.",
      "v3.",
    ]) || /\b\d+\.\d+(\.\d+)?\b/.test(p)
  );
}

export function hasInputDataForExtraction(p: string) {
  const low = p.toLowerCase();
  return (
    low.includes("text:") ||
    low.includes("texto:") ||
    low.includes("input:") ||
    low.includes("entrada:") ||
    /```[\s\S]*?```/.test(p) ||
    /"[^"]{10,}"/.test(p)
  );
}

/**
 * ✅ Schema fuerte (dataset definition):
 * - JSON example (object with keys), or
 * - JSON Schema (properties/type), or
 * - Formal definition (interface/zod/pydantic)
 *
 * 🚫 NO cuenta como schema fuerte:
 * - "Fields/Campos:" con bullets y tipos (eso es solo lista de campos)
 */
export function hasStrongSchema(p: string) {
  // JSON codeblock with object-like keys
  if (/```json[\s\S]*?{[\s\S]*?["'][^"']+["']\s*:\s*[\s\S]*?}[\s\S]*?```/i.test(p)) return true;

  // JSON object example (not necessarily in code block)
  if (/{[\s\S]*?["'][A-Za-z0-9_.-]+["']\s*:\s*[\s\S]*?}/.test(p)) return true;

  // JSON Schema markers
  if (/"properties"\s*:/i.test(p) || /\bproperties\s*:/i.test(p)) return true;
  if (/"type"\s*:\s*"(object|array|string|number|boolean)"/i.test(p)) return true;

  // Formal definitions
  if (/\binterface\s+\w+\s*{[\s\S]*?}/i.test(p)) return true;
  if (/\bz\.object\s*\(/i.test(p)) return true;
  if (/\bBaseModel\b/i.test(p)) return true;

  return false;
}

export function wantsJson(outputFormat: OutputFormat | null | undefined, prompt: string) {
  const low = (prompt ?? "").toLowerCase();
  return (
    outputFormat?.kind === "json" ||
    low.includes("only json") ||
    low.includes("solo json") ||
    low.includes("return only valid json") ||
    low.includes("json")
  );
}

export function isExtractionLike(taskType: any, prompt: string, lang: Lang) {
  const low = (prompt ?? "").toLowerCase();
  const byTask = String(taskType ?? "").toLowerCase() === "data_extraction";

  const byWords =
    lang === "es"
      ? includesAny(low, ["extrae", "extraer", "extracción", "parsea", "parseá", "campos:", "claves:", "fields:"])
      : includesAny(low, ["extract", "extraction", "parse", "fields:", "keys:"]);

  return byTask || byWords;
}

export function isDebugLike(taskType: any, prompt: string, lang: Lang) {
  const low = (prompt ?? "").toLowerCase();
  const byTask = String(taskType ?? "").toLowerCase() === "debugging";

  const byWords =
    lang === "es"
      ? includesAny(low, ["bug", "error", "crash", "no funciona", "rompe", "stacktrace", "traceback"])
      : includesAny(low, ["bug", "error", "crash", "doesn't work", "stacktrace", "traceback"]);

  return byTask || byWords;
}
