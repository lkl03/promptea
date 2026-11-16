// lib/purposes.ts
//
// UI options for prompt purposes, derived from the canonical PURPOSES array
// so the selector can never drift from the API schema or the engine.

import { PURPOSES, type Lang, type PromptPurpose } from "@/lib/domain";

const LABELS: Record<PromptPurpose, Record<Lang, string>> = {
  text: { es: "Texto", en: "Text", pt: "Texto", zh: "文本" },
  study: { es: "Estudio", en: "Study", pt: "Estudo", zh: "学习" },
  code: { es: "Código", en: "Code", pt: "Código", zh: "代码" },
  data: { es: "Data/JSON", en: "Data/JSON", pt: "Dados/JSON", zh: "数据/JSON" },
  image: { es: "Imagen", en: "Image", pt: "Imagem", zh: "图像" },
  marketing: { es: "Marketing", en: "Marketing", pt: "Marketing", zh: "营销" },
  translation: { es: "Traducción", en: "Translation", pt: "Tradução", zh: "翻译" },
  summarization: { es: "Resumen", en: "Summary", pt: "Resumo", zh: "摘要" },
};

export function purposeOptions(lang: Lang): Array<{ value: PromptPurpose; label: string }> {
  return PURPOSES.map((value) => ({ value, label: LABELS[value][lang] }));
}

export function purposeLabel(purpose: PromptPurpose, lang: Lang): string {
  return LABELS[purpose][lang];
}
