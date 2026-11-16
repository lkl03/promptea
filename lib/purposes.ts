// lib/purposes.ts
//
// UI options for prompt purposes, derived from the canonical PURPOSES array
// so the selector can never drift from the API schema or the engine.

import { PURPOSES, type Lang, type PromptPurpose } from "@/lib/domain";

const LABELS: Record<PromptPurpose, Record<Lang, string>> = {
  text: { es: "Texto", en: "Text", pt: "Texto", zh: "Text" },
  study: { es: "Estudio", en: "Study", pt: "Estudo", zh: "Study" },
  code: { es: "Código", en: "Code", pt: "Código", zh: "Code" },
  data: { es: "Data/JSON", en: "Data/JSON", pt: "Dados/JSON", zh: "Data/JSON" },
  image: { es: "Imagen", en: "Image", pt: "Imagem", zh: "Image" },
  marketing: { es: "Marketing", en: "Marketing", pt: "Marketing", zh: "Marketing" },
  translation: { es: "Traducción", en: "Translation", pt: "Tradução", zh: "Translation" },
  summarization: { es: "Resumen", en: "Summary", pt: "Resumo", zh: "Summary" },
};

export function purposeOptions(lang: Lang): Array<{ value: PromptPurpose; label: string }> {
  return PURPOSES.map((value) => ({ value, label: LABELS[value][lang] }));
}

export function purposeLabel(purpose: PromptPurpose, lang: Lang): string {
  return LABELS[purpose][lang];
}
