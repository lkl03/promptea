"use client";

// components/LanguageSwitcher.tsx
//
// One segmented control with every interface language (lib/domain.ts LANGS):
// ES | EN | PT. Each option is a plain link to the same page in that language,
// so it works without JavaScript and crawlers can follow it. The current
// language is marked with aria-current; each link names its language in that
// language (aria-label + lang) for screen readers.

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LANGS, LANG_LABEL, LANG_NAME, LANG_TAG, isLang, type Lang } from "@/lib/domain";

/** The same path under another locale: `/es/guides/x` → `/pt/guides/x`. */
export function replaceLocale(pathname: string, nextLocale: Lang) {
  const parts = pathname.split("/");
  // parts[0] = "" ; parts[1] = locale
  if (isLang(parts[1])) {
    parts[1] = nextLocale;
  } else {
    parts.splice(1, 0, nextLocale);
  }
  return parts.join("/") || "/";
}

export default function LanguageSwitcher({ lang, label }: { lang: Lang; label: string }) {
  const pathname = usePathname() ?? `/${lang}`;

  return (
    <nav aria-label={label} data-language-switcher className="inline-flex h-9 shrink-0 items-center rounded-full border border-line bg-transparent p-0.5 text-xs sm:p-1">
      {LANGS.map((l) => {
        const active = l === lang;
        return (
          <Link
            key={l}
            href={replaceLocale(pathname, l)}
            hrefLang={LANG_TAG[l]}
            lang={LANG_TAG[l]}
            aria-label={LANG_NAME[l]}
            aria-current={active ? "true" : undefined}
            title={LANG_NAME[l]}
            className={[
              // Three languages on a 375 px header: tighter on phones, the v1.8.1 size from `sm` up.
              "rounded-full px-2 py-1 transition max-[340px]:px-1.5 sm:px-3",
              active ? "bg-ink text-canvas font-medium" : "text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {LANG_LABEL[l]}
          </Link>
        );
      })}
    </nav>
  );
}
