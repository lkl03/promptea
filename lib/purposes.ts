// lib/purposes.ts
//
// UI options for prompt purposes, derived from the canonical PURPOSES array
// so the selector can never drift from the API schema or the engine.

import { PURPOSES, type Lang, type PromptPurpose } from "@/lib/domain";

const LABELS: Record<PromptPurpose, { es: string; en: string }> = {
  text: { es: "Texto", en: "Text" },
  study: { es: "Estudio", en: "Study" },
  code: { es: "Código", en: "Code" },
  data: { es: "Data/JSON", en: "Data/JSON" },
  image: { es: "Imagen", en: "Image" },
  marketing: { es: "Marketing", en: "Marketing" },
  translation: { es: "Traducción", en: "Translation" },
  summarization: { es: "Resumen", en: "Summary" },
};

export function purposeOptions(lang: Lang): Array<{ value: PromptPurpose; label: string }> {
  return PURPOSES.map((value) => ({ value, label: LABELS[value][lang] }));
}

export function purposeLabel(purpose: PromptPurpose, lang: Lang): string {
  return LABELS[purpose][lang];
}
