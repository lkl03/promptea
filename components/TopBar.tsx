"use client";

// components/TopBar.tsx
//
// The site header. v1.8.1: ONE bar for every page, the home included (until
// v1.8.0 the home rendered its own pair of controls and listed "Prompts ·
// Guides · Models · Glossary · Library" as loose links in the middle of the
// page). Three slots on one row:
//
//   left    the brand logo (a link home). On the home page the big logo is the
//           page's <h1> right below, so the small one is not repeated there.
//   centre  the navigation, centred: tools first (Analyzer, Best AI, AI Daily,
//           Benchmarks), then resources (Prompts, Guides, Models, Glossary,
//           Library), separated by a hairline.
//   right   language switch + theme toggle.
//
// From `lg` up the links are inline. Below that they collapse into a "Menu"
// disclosure (button with aria-expanded / aria-controls; the panel is plain
// in-flow content, not a modal): Esc closes it and returns focus to the
// button, it closes on navigation and on a click outside, and every link is a
// normal tab stop. Labels come from the dictionary (dict.nav), never from this
// file, so a new locale needs no change here.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import BrandLogo from "./BrandLogo";
import type { Lang } from "@/lib/domain";

export type NavDict = {
  main: string; // aria-label of the navigation
  home: string; // aria-label of the logo link
  menu: string;
  closeMenu: string;
  language: string; // aria-label of the language switcher
  analyzer: string;
  bestAi: string;
  daily: string;
  benchmarks: string;
  prompts: string;
  guides: string;
  models: string;
  glossary: string;
  library: string;
};

type NavKey = Exclude<keyof NavDict, "main" | "home" | "menu" | "closeMenu" | "language">;

/** Order and grouping of the navigation. `group` only draws the hairline between tools and resources. */
export const NAV_LINKS: ReadonlyArray<{ key: NavKey; path: string; group: "tools" | "resources" }> = [
  { key: "analyzer", path: "/analyzer", group: "tools" },
  { key: "bestAi", path: "/best-ai", group: "tools" },
  { key: "daily", path: "/blog", group: "tools" },
  { key: "benchmarks", path: "/benchmarks", group: "tools" },
  { key: "prompts", path: "/prompts", group: "resources" },
  { key: "guides", path: "/guides", group: "resources" },
  { key: "models", path: "/models", group: "resources" },
  { key: "glossary", path: "/glossary", group: "resources" },
  { key: "library", path: "/library", group: "resources" },
];

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

export default function TopBar({ lang, dict }: { lang: Lang; dict: NavDict }) {
  const pathname = usePathname() ?? "";
  const isHome = pathname === `/${lang}` || pathname === `/${lang}/`;
  const [open, setOpen] = useState(false);
  // v1.8.3: a fixed id (there is exactly one site header per page). useId() depends on the
  // position in the React tree, and under load in development the server and client trees
  // disagreed on it ("a tree hydrated but some attributes… didn't match": aria-controls / id).
  const panelId = "site-nav-panel";
  const rootRef = useRef<HTMLElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Close on navigation: the menu belongs to the page it was opened on.
  const [openedOn, setOpenedOn] = useState(pathname);
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault(); // this Escape is ours: nothing else should also close on it
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const links = NAV_LINKS.map((item) => {
    const href = `/${lang}${item.path}`;
    return { ...item, href, label: dict[item.key], active: pathname === href || pathname.startsWith(`${href}/`) };
  });

  return (
    <header ref={rootRef} className="relative z-30 mx-auto w-full max-w-6xl px-4 pb-2 pt-4 3xl:max-w-7xl">
      <div className="site-header-bar grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 lg:grid-cols-[1fr_auto_1fr]">
        {/* Left: brand (not repeated on the home page, where the logo is the <h1>) */}
        <div className="flex min-w-0 items-center">
          {isHome ? (
            <span className="hidden lg:block" aria-hidden="true" />
          ) : (
            <Link href={`/${lang}`} className="rounded-sm transition-opacity hover:opacity-80" aria-label={dict.home}>
              {/* v1.8.2: a third language in the switcher — the logo is a little smaller below `sm` so both fit down to 320 px. */}
              <BrandLogo height={20} smHeight={26} />
            </Link>
          )}
          {/* Below lg the menu button takes the left slot on the home page, so the row never looks empty. */}
          {isHome ? (
            <button
              ref={btnRef}
              type="button"
              data-nav-toggle
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((v) => !v)}
              className="btn btn-ghost h-9 gap-2 px-3 lg:hidden"
            >
              <MenuIcon open={open} />
              <span>{open ? dict.closeMenu : dict.menu}</span>
            </button>
          ) : null}
        </div>

        {/* Centre: inline navigation (lg+) */}
        <nav aria-label={dict.main} className="hidden lg:block">
          <ul className="flex items-center gap-x-0.5 text-[13px] xl:gap-x-1 xl:text-sm">
            {links.map((item, i) => (
              <li key={item.key} className="flex items-center">
                {i > 0 && item.group !== links[i - 1].group ? <span aria-hidden="true" className="mx-1.5 h-4 w-px bg-line-strong xl:mx-2" /> : null}
                <Link
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  className={[
                    "whitespace-nowrap rounded-lg px-2 py-1 transition-colors xl:px-2.5",
                    item.active ? "bg-surface-soft text-ink" : "text-ink-muted hover:bg-surface-soft hover:text-ink",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right: language + theme (+ the menu button on internal pages below lg) */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          {!isHome ? (
            <button
              ref={btnRef}
              type="button"
              data-nav-toggle
              aria-expanded={open}
              aria-controls={panelId}
              aria-label={open ? dict.closeMenu : dict.menu}
              title={open ? dict.closeMenu : dict.menu}
              onClick={() => setOpen((v) => !v)}
              className="btn-icon h-9 w-9 lg:hidden"
            >
              <MenuIcon open={open} />
            </button>
          ) : null}
          <LanguageSwitcher lang={lang} label={dict.language} />
          <ThemeToggle lang={lang} />
        </div>

        {/* Collapsible navigation (below lg). In flow, so it pushes content instead of covering it. */}
        <nav id={panelId} aria-label={dict.main} hidden={!open} className="col-span-full lg:hidden">
          <ul className="grid grid-cols-2 gap-1 border-t border-line pt-2 text-sm sm:grid-cols-3">
            {links.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={[
                    "block rounded-lg px-3 py-2.5 transition-colors",
                    item.active ? "bg-surface-soft font-medium text-ink" : "text-ink-muted hover:bg-surface-soft hover:text-ink",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
