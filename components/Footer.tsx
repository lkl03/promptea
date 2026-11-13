// components/Footer.tsx
import Link from "next/link";
import AppFeedbackButton from "@/components/AppFeedbackButton";
import { APP_VERSION } from "@/lib/version";
import type { AppFeedbackDict } from "@/lib/uiDict";
import { weeklyArchivePath } from "@/lib/newsletter/paths";
import { getXLinks } from "@/lib/social";
import { pick, type Lang } from "@/lib/domain";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.3L6.5 22H3.4l7.3-8.4L1 2h6.4l4.4 5.6L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z"
      />
    </svg>
  );
}

export default function Footer({
  lang,
  appFeedbackDict,
  labels,
}: {
  lang: Lang;
  appFeedbackDict: AppFeedbackDict;
  /** v1.8.3 — labels of the links added with the Tech edition; they come from the dictionaries (dict.nav). */
  labels: { tech: string; sources: string };
}) {
  const year = new Date().getFullYear();
  const privacyLabel = pick(lang, { es: "Privacidad", en: "Privacy", pt: "Privacidade" });
  const homeLabel = pick(lang, { es: "Inicio", en: "Home", pt: "Início" });
  const promptsLabel = pick(lang, { es: "Prompts", en: "Prompts", pt: "Prompts" });
  const guidesLabel = pick(lang, { es: "Guías", en: "Guides", pt: "Guias" });
  const modelsLabel = pick(lang, { es: "Modelos", en: "Models", pt: "Modelos" });
  const glossaryLabel = pick(lang, { es: "Glosario", en: "Glossary", pt: "Glossário" });
  const blogLabel = pick(lang, { es: "IA al Día", en: "AI Daily", pt: "AI Daily" });
  const weeklyLabel = pick(lang, { es: "Resumen semanal", en: "Weekly digest", pt: "Resumo semanal" });
  const resourcesLabel = pick(lang, { es: "Recursos útiles", en: "Useful resources", pt: "Recursos úteis" });
  const eterlabMessage = pick(lang, { es: "diseñado y desarrollado por", en: "designed and developed by", pt: "design e desenvolvimento por" });
  const followLabel = pick(lang, { es: "Seguinos en X", en: "Follow us on X", pt: "Siga a gente no X" });
  const xUrl = getXLinks().url;

  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-8 pt-10 3xl:max-w-7xl">
      <div className="h-px w-full bg-line" />

      {/* Primary navigation */}
      <nav
        aria-label={pick(lang, { es: "Pie de página", en: "Footer navigation", pt: "Navegação do rodapé" })}
        className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs opacity-80"
      >
        <span>V{APP_VERSION}</span>

        <Link href={`/${lang}/`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          {homeLabel}
        </Link>

        <Link href={`/${lang}/changelog`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          Changelog
        </Link>

        <Link href={`/${lang}/privacy`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          {privacyLabel}
        </Link>

        <AppFeedbackButton lang={lang} dict={appFeedbackDict} />

        <a
          href={xUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={followLabel}
          className="group relative inline-flex items-center justify-center h-8 w-8 rounded-full border
                     border-line bg-surface-soft hover:border-line-strong hover:text-ink
                     transition"
        >
          <XIcon className="h-4 w-4 opacity-90" />
          <span
            className="pointer-events-none absolute -top-9 hidden sm:block left-1/2 -translate-x-1/2 whitespace-nowrap
                       rounded-full border px-2.5 py-1 text-[11px] leading-none
                       bg-surface-raised text-ink border-line
                       opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0
                       transition"
          >
            {followLabel}
          </span>
        </a>
      </nav>

      {/* Useful resources */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs opacity-80">
        <span className="opacity-70">{resourcesLabel}:</span>

        <Link href={`/${lang}/prompts`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          {promptsLabel}
        </Link>

        <Link href={`/${lang}/guides`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          {guidesLabel}
        </Link>

        <Link href={`/${lang}/models`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          {modelsLabel}
        </Link>

        <Link href={`/${lang}/glossary`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          {glossaryLabel}
        </Link>

        <Link href={`/${lang}/blog`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          {blogLabel}
        </Link>

        {/* v1.8.3: the Tech section of AI Daily and the public page about its sources. */}
        <Link href={`/${lang}/blog/tech`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          {labels.tech}
        </Link>

        <Link href={`/${lang}/sources`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          {labels.sources}
        </Link>

        <Link href={weeklyArchivePath(lang)} className="hover:underline underline-offset-2 transition-all ease-in-out">
          {weeklyLabel}
        </Link>

        <Link href={`/${lang}/benchmarks`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          Benchmarks
        </Link>

        <Link href={`/${lang}/analyzer`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          {pick(lang, { es: "Analizador", en: "Analyzer", pt: "Analisador" })}
        </Link>

        <Link href={`/${lang}/library`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          {pick(lang, { es: "Biblioteca", en: "Library", pt: "Biblioteca" })}
        </Link>
      </div>

      {/* Copyright */}
      <div className="mt-4 flex flex-wrap items-center justify-center text-xs text-ink-faint">
        <span>
          © {year} · {eterlabMessage}{" "}
          <Link href="https://eterlab.co" className="hover:text-ink transition-all ease-in-out">
            eterlab
          </Link>
          .
        </span>
      </div>
    </footer>
  );
}
