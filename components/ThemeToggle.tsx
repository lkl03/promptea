"use client";

import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = useMemo(() => {
    if (!mounted) return true;
    return resolvedTheme === "dark";
  }, [mounted, resolvedTheme]);

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative inline-flex h-9 w-18.5 items-center rounded-full border px-1
                 bg-transparent transition-all duration-200 ease-in-out
                 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/40
                 focus:outline-none focus:ring-2 focus:ring-zinc-400/40 dark:focus:ring-zinc-500/40
                 cursor-pointer"
    >
      <span
        className={[
          "h-7 w-7 rounded-full border bg-white shadow-sm transition-transform duration-200 ease-in-out",
          "dark:bg-zinc-950",
          isDark ? "translate-x-9.5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}



