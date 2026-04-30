"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

export default function ThemeToggle({ lang = "en" }: { lang?: "es" | "en" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // While unmounted, render a stable placeholder of the same size to avoid
  // hydration mismatch and layout shift. The icon stays neutral.
  if (!mounted) {
    return (
      <button
        type="button"
        suppressHydrationWarning
        aria-label={lang === "es" ? "Cambiar tema" : "Toggle theme"}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border
                   border-zinc-300/60 bg-white/30 text-zinc-700
                   dark:border-white/10 dark:bg-zinc-950/30 dark:text-zinc-200
                   transition-colors"
      >
        <SunIcon className="h-4 w-4 opacity-70" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const next = isDark ? "light" : "dark";
  const label =
    lang === "es"
      ? isDark
        ? "Cambiar a tema claro"
        : "Cambiar a tema oscuro"
      : isDark
      ? "Switch to light theme"
      : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border
                 border-zinc-300/60 bg-white/30 text-zinc-700
                 hover:bg-white/55
                 dark:border-white/10 dark:bg-zinc-950/30 dark:text-zinc-200
                 dark:hover:bg-zinc-900/50
                 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 dark:focus:ring-zinc-500/40
                 transition-colors"
    >
      {isDark ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
    </button>
  );
}
