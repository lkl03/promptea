import Link from "next/link";
import AppFeedbackButton from "@/components/AppFeedbackButton";

export default function Footer({ lang }: { lang: "es" | "en" }) {
  const year = new Date().getFullYear();
  const privacyLabel = lang === "es" ? "Privacidad" : "Privacy";
  const homeInicio = lang === "es" ? "Inicio" : "Home";
  const eterlabMessage = lang === "es" ? "diseñado y desarrollado por" : "designed and developed by";

  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-8 pt-10 3xl:max-w-7xl">
      <div className="h-px w-full bg-zinc-200/70 dark:bg-zinc-800/60" />
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs opacity-80">
        <span>V1.0.0</span>
        <Link href={`/${lang}/`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          {homeInicio}
        </Link>
        <span className="opacity-50">|</span>
        <Link href={`/${lang}/changelog`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          Changelog
        </Link>
        <span className="opacity-50">|</span>
        <Link href={`/${lang}/privacy`} className="hover:underline underline-offset-2 transition-all ease-in-out">
          {privacyLabel}
        </Link>
        <span className="opacity-50">|</span>
        <AppFeedbackButton lang={lang} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center text-xs text-gray-400">
                <span>© {year} | {eterlabMessage} <Link href="https://eterlab.co" className="hover:text-white! transition-all ease-in-out">eterlab</Link>.</span>
      </div>
    </footer>
  );
}



