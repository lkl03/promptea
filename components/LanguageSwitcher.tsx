"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function replaceLocale(pathname: string, nextLocale: "es" | "en") {
  const parts = pathname.split("/");
  // parts[0] = "" ; parts[1] = locale
  if (parts[1] === "es" || parts[1] === "en") {
    parts[1] = nextLocale;
  } else {
    parts.splice(1, 0, nextLocale);
  }
  return parts.join("/") || "/";
}

export default function LanguageSwitcher({ lang }: { lang: "es" | "en" }) {
  const pathname = usePathname();
  const esHref = replaceLocale(pathname, "es");
  const enHref = replaceLocale(pathname, "en");

  return (
    <div className="inline-flex h-9 items-center rounded-full border bg-transparent p-1 text-xs">
      <Link
        href={esHref}
        className={[
          "px-3 py-1 rounded-full transition",
          lang === "es"
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "opacity-80 hover:opacity-100",
        ].join(" ")}
      >
        ES
      </Link>
      <Link
        href={enHref}
        className={[
          "px-3 py-1 rounded-full transition",
          lang === "en"
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "opacity-80 hover:opacity-100",
        ].join(" ")}
      >
        EN
      </Link>
    </div>
  );
}
