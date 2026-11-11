import type { Lang, FindingId, Severity } from "../types";
import { vocabularyLang } from "@/lib/refine/language";
import { PT_EXPLANATION, PT_ONLY_JSON, PT_SUPER_SHORT } from "../../pt";

type AddFinding = (id: FindingId, severity: Severity) => void;

export function applyContradictions(opts: { prompt: string; lang: Lang; addFinding: AddFinding }) {
  const { prompt, lang, addFinding } = opts;
  const low = (prompt ?? "").toLowerCase();

  // v1.8.2: which vocabulary to read the prompt with (Portuguese when it reads as Portuguese).
  const vocab = vocabularyLang(prompt ?? "", lang);

  const wantsOnlyJson =
    low.includes("only json") ||
    low.includes("solo json") ||
    low.includes("return only valid json") ||
    low.includes("json only") ||
    (vocab === "pt" && PT_ONLY_JSON.test(low));

  const wantsExplanation =
    vocab === "pt"
      ? PT_EXPLANATION.test(low)
      : lang === "es"
        ? low.includes("explic") || low.includes("razon") || low.includes("coment") || low.includes("paso a paso")
        : low.includes("explain") || low.includes("reason") || low.includes("comment") || low.includes("step by step");

  // Contradicción: "solo json" pero pedís explicación
  if (wantsOnlyJson && wantsExplanation) {
    addFinding("contradiction", "high");
  }

  // Contradicción: “muy detallado” + “máx 3 líneas/1 frase”
  const wantsDetailed =
    vocab === "pt"
      ? low.includes("muito detalh") || low.includes("bem detalh") || low.includes("em detalhe")
      : lang === "es"
        ? low.includes("muy detall") || low.includes("bien detall")
        : low.includes("very detailed") || low.includes("in detail");

  const wantsSuperShort =
    /máx\s*\d+\s*l[ií]neas/.test(low) ||
    /max\s*\d+\s*lines/.test(low) ||
    /una\s*frase/.test(low) ||
    /one\s*sentence/.test(low) ||
    (vocab === "pt" && PT_SUPER_SHORT.test(low));

  if (wantsDetailed && wantsSuperShort) {
    addFinding("contradiction", "medium");
  }
}
