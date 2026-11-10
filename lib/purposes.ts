// lib/purposes.ts
//
// UI options for prompt purposes, derived from the canonical PURPOSES array
// so the selector can never drift from the API schema or the engine.

import { PURPOSES, type Lang, type PromptPurpose } from "@/lib/domain";

const LABELS: Record<PromptPurpose, Record<Lang, string>> = {
  text: { es: "Texto", en: "Text", pt: "Text" },
  study: { es: "Estudio", en: "Study", pt: "Study" },
  code: { es: "Código", en: "Code", pt: "Code" },
  data: { es: "Data/JSON", en: "Data/JSON", pt: "Data/JSON" },
  image: { es: "Imagen", en: "Image", pt: "Image" },
  marketing: { es: "Marketing", en: "Marketing", pt: "Marketing" },
  translation: { es: "Traducción", en: "Translation", pt: "Translation" },
  summarization: { es: "Resumen", en: "Summary", pt: "Summary" },
};

export function purposeOptions(lang: Lang): Array<{ value: PromptPurpose; label: string }> {
  return PURPOSES.map((value) => ({ value, label: LABELS[value][lang] }));
}

export function purposeLabel(purpose: PromptPurpose, lang: Lang): string {
  return LABELS[purpose][lang];
}
