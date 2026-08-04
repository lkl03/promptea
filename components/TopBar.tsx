import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";

const NAV_LINKS = [
  { key: "home", href: (l: string) => `/${l}`, label: { es: "Analizador", en: "Analyzer" } },
  { key: "best-ai", href: (l: string) => `/${l}/best-ai`, label: { es: "Elegir IA", en: "Best AI" } },
  { key: "prompts", href: (l: string) => `/${l}/prompts`, label: { es: "Prompts", en: "Prompts" } },
  { key: "guides", href: (l: string) => `/${l}/guides`, label: { es: "Guías", en: "Guides" } },
  { key: "models", href: (l: string) => `/${l}/models`, label: { es: "Modelos", en: "Models" } },
  { key: "glossary", href: (l: string) => `/${l}/glossary`, label: { es: "Glosario", en: "Glossary" } },
] as const;

export default function TopBar({ lang }: { lang: "es" | "en" }) {
  return (
    <header className="mx-auto w-full max-w-6xl px-4 pt-4 pb-2 3xl:max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {/* Wordmark */}
        <Link
          href={`/${lang}`}
          className="font-title text-base font-semibold tracking-tight text-ink
                     hover:opacity-80 transition-opacity rounded-sm"
          aria-label="Promptea — home"
        >
          Promptea<span className="text-accent">.</span>
        </Link>

        {/* Nav links — wrap on small screens */}
        <nav aria-label={lang === "es" ? "Navegación principal" : "Main navigation"}>
          <ul className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
            {NAV_LINKS.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href(lang)}
                  className="px-2.5 py-1 rounded-lg text-ink-muted hover:text-ink
                             hover:bg-surface-soft transition-colors"
                >
                  {item.label[lang]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher lang={lang} />
          <ThemeToggle lang={lang} />
        </div>
      </div>
    </header>
  );
}
