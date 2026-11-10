// lib/purposes.ts
//
// UI options for prompt purposes, derived from the canonical PURPOSES array
// so the selector can never drift from the API schema or the engine.

import { PURPOSES, type Lang, type PromptPurpose } from "@/lib/domain";

const LABELS: Record<PromptPurpose, Record<Lang, string>> = {
  text: { es: "Texto", en: "Text", pt: "Texto" },
  study: { es: "Estudio", en: "Study", pt: "Estudo" },
  code: { es: "Código", en: "Code", pt: "Código" },
  data: { es: "Data/JSON", en: "Data/JSON", pt: "Dados/JSON" },
  image: { es: "Imagen", en: "Image", pt: "Imagem" },
  marketing: { es: "Marketing", en: "Marketing", pt: "Marketing" },
  translation: { es: "Traducción", en: "Translation", pt: "Tradução" },
  summarization: { es: "Resumen", en: "Summary", pt: "Resumo" },
};

export function purposeOptions(lang: Lang): Array<{ value: PromptPurpose; label: string }> {
  return PURPOSES.map((value) => ({ value, label: LABELS[value][lang] }));
}

export function purposeLabel(purpose: PromptPurpose, lang: Lang): string {
  return LABELS[purpose][lang];
}
