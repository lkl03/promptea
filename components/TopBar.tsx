"use client";

// components/TopBar.tsx
//
// The full header for internal pages. v1.7.0: the wordmark is the brand logo
// with the mascot, the analyzer moved to /{lang}/analyzer, Benchmarks joined
// the nav, and the bar is a material surface in the Glass theme
// (.site-header-bar). The homepage hub renders its own minimal controls
// (language + theme, no navigation), so this header steps aside there.

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import BrandLogo from "./BrandLogo";

const NAV_LINKS = [
  { key: "analyzer", href: (l: string) => `/${l}/analyzer`, label: { es: "Analizador", en: "Analyzer" } },
  { key: "best-ai", href: (l: string) => `/${l}/best-ai`, label: { es: "Elegir IA", en: "Best AI" } },
  { key: "blog", href: (l: string) => `/${l}/blog`, label: { es: "IA al Día", en: "AI Daily" } },
  { key: "benchmarks", href: (l: string) => `/${l}/benchmarks`, label: { es: "Benchmarks", en: "Benchmarks" } },
  { key: "prompts", href: (l: string) => `/${l}/prompts`, label: { es: "Prompts", en: "Prompts" } },
  { key: "guides", href: (l: string) => `/${l}/guides`, label: { es: "Guías", en: "Guides" } },
  { key: "models", href: (l: string) => `/${l}/models`, label: { es: "Modelos", en: "Models" } },
  { key: "glossary", href: (l: string) => `/${l}/glossary`, label: { es: "Glosario", en: "Glossary" } },
] as const;

export default function TopBar({ lang }: { lang: "es" | "en" }) {
  const pathname = usePathname() ?? "";
  // The hub (/{lang} with no sub-path) has its own minimal header.
  if (pathname === `/${lang}` || pathname === `/${lang}/`) return null;

  return (
    <header className="mx-auto w-full max-w-6xl px-4 pt-4 pb-2 3xl:max-w-7xl">
      <div className="site-header-bar flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <Link
          href={`/${lang}`}
          className="rounded-sm transition-opacity hover:opacity-80"
          aria-label={lang === "es" ? "Promptea — inicio" : "Promptea — home"}
        >
          <BrandLogo height={26} />
        </Link>

        <nav aria-label={lang === "es" ? "Navegación principal" : "Main navigation"}>
          <ul className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
            {NAV_LINKS.map((item) => {
              const href = item.href(lang);
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={item.key}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "rounded-lg px-2.5 py-1 transition-colors",
                      active ? "bg-surface-soft text-ink" : "text-ink-muted hover:bg-surface-soft hover:text-ink",
                    ].join(" ")}
                  >
                    {item.label[lang]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher lang={lang} />
          <ThemeToggle lang={lang} />
        </div>
      </div>
    </header>
  );
}
