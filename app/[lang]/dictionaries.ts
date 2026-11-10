import "server-only";

import { isLang, type Lang } from "@/lib/domain";

// One loader per language in lib/domain.ts LANGS (a missing one is a type error).
const dictionaries: Record<Lang, () => Promise<typeof import("./dictionaries/en.json")>> = {
  es: () => import("./dictionaries/es.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  pt: () => import("./dictionaries/pt.json").then((m) => m.default),
};

export type Locale = Lang;

export const hasLocale = (locale: string): locale is Locale => isLang(locale);

export const getDictionary = async (locale: Locale) => dictionaries[locale]();
