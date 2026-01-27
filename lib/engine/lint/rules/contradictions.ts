import type { Lang, FindingId, Severity } from "../types";

type AddFinding = (id: FindingId, severity: Severity) => void;

export function applyContradictions(opts: { prompt: string; lang: Lang; addFinding: AddFinding }) {
  const { prompt, lang, addFinding } = opts;
  const low = (prompt ?? "").toLowerCase();

  const wantsOnlyJson =
    low.includes("only json") || low.includes("solo json") || low.includes("return only valid json") || low.includes("json only");

  const wantsExplanation =
    lang === "es"
      ? low.includes("explic") || low.includes("razon") || low.includes("coment") || low.includes("paso a paso")
      : low.includes("explain") || low.includes("reason") || low.includes("comment") || low.includes("step by step");

  // Contradicción: "solo json" pero pedís explicación
  if (wantsOnlyJson && wantsExplanation) {
    addFinding("contradiction", "high");
  }

  // Contradicción: “muy detallado” + “máx 3 líneas/1 frase”
  const wantsDetailed =
    lang === "es" ? low.includes("muy detall") || low.includes("bien detall") : low.includes("very detailed") || low.includes("in detail");

  const wantsSuperShort =
    /máx\s*\d+\s*l[ií]neas/.test(low) ||
    /max\s*\d+\s*lines/.test(low) ||
    /una\s*frase/.test(low) ||
    /one\s*sentence/.test(low);

  if (wantsDetailed && wantsSuperShort) {
    addFinding("contradiction", "medium");
  }
}
