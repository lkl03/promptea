// components/Footer.tsx
import Link from "next/link";
import AppFeedbackButton from "@/components/AppFeedbackButton";
import { APP_VERSION } from "@/lib/version";

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

export default function Footer({ lang }: { lang: "es" | "en" }) {
  const year = new Date().getFullYear();
  const privacyLabel = lang === "es" ? "Privacidad" : "Privacy";
  const homeLabel = lang === "es" ? "Inicio" : "Home";
  const promptsLabel = lang === "es" ? "Prompts" : "Prompts";
  const guidesLabel = lang === "es" ? "Guías" : "Guides";
  const modelsLabel = lang === "es" ? "Modelos" : "Models";
  const glossaryLabel = lang === "es" ? "Glosario" : "Glossary";
  const resourcesLabel = lang === "es" ? "Recursos útiles" : "Useful resources";
  const eterlabMessage = lang === "es" ? "diseñado y desarrollado por" : "designed and developed by";
  const followLabel = lang === "es" ? "Seguinos en X" : "Follow us on X";
  const xUrl = (process.env.NEXT_PUBLIC_X_URL || "https://x.com") as string;

  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-8 pt-10 3xl:max-w-7xl">
      <div className="h-px w-full bg-zinc-200/70 dark:bg-zinc-800/60" />

      {/* Primary navigation */}
      <nav
        aria-label={lang === "es" ? "Pie de página" : "Footer navigation"}
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

        <AppFeedbackButton lang={lang} />

        <a
          href={xUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={followLabel}
          className="group relative inline-flex items-center justify-center h-8 w-8 rounded-full border
                     border-zinc-900/10 bg-white/20 hover:bg-white/35
                     dark:border-white/10 dark:bg-zinc-950/20 dark:hover:bg-zinc-950/35
                     transition"
        >
          <XIcon className="h-4 w-4 opacity-90" />
          <span
            className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap
                       rounded-full border px-2.5 py-1 text-[11px] leading-none
                       bg-white text-zinc-900 border-zinc-900/10
                       dark:bg-zinc-950 dark:text-zinc-50 dark:border-white/10
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

        <Link href={`/${lang}/landing/prompt-analyzer`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          {lang === "es" ? "Analizador" : "Analyzer"}
        </Link>
      </div>

      {/* Copyright */}
      <div className="mt-4 flex flex-wrap items-center justify-center text-xs text-gray-400">
        <span>
          © {year} · {eterlabMessage}{" "}
          <Link href="https://eterlab.co" className="hover:text-white! transition-all ease-in-out">
            eterlab
          </Link>
          .
        </span>
      </div>
    </footer>
  );
}
