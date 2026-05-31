import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";

const NAV_LINKS = [
  { key: "home", href: (l: string) => `/${l}`, label: { es: "Analizador", en: "Analyzer" } },
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
          className="font-title text-base font-semibold tracking-tight
                     text-zinc-900 dark:text-zinc-50
                     hover:opacity-80 transition-opacity focus:outline-none
                     focus:ring-2 focus:ring-zinc-400/40 rounded-sm"
          aria-label="Promptea — home"
        >
          Promptea
        </Link>

        {/* Nav links — wrap on small screens */}
        <nav aria-label={lang === "es" ? "Navegación principal" : "Main navigation"}>
          <ul className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
            {NAV_LINKS.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href(lang)}
                  className="px-2.5 py-1 rounded-lg opacity-70 hover:opacity-100
                             hover:bg-zinc-100/60 dark:hover:bg-zinc-800/50
                             focus:outline-none focus:ring-2 focus:ring-zinc-400/40 dark:focus:ring-zinc-500/40
                             transition-all"
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
