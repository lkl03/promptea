import type { Locale } from "./site";

export type Purpose = "text" | "study" | "code" | "data" | "image" | "marketing";
export type TargetModel = "gpt" | "gemini" | "claude" | "grok" | "kimi" | "deepseek";

export function buildPrefillHref(opts: {
  lang: Locale;
  prompt: string;
  purpose: Purpose;
  target: TargetModel;
}): string {
  const { lang, prompt, purpose, target } = opts;
  const qs = new URLSearchParams({
    prompt,
    purpose,
    target,
  });
  return `/${lang}?${qs.toString()}`;
}
