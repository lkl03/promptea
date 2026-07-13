"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { THEMES, THEME_LABELS, type ThemeName } from "@/lib/themes";

function subscribeNoop() {
  return () => {};
}

/** Hydration-safe mounted flag without setState-in-effect. */
function useMounted() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}

function SwatchIcon({ theme, className }: { theme: ThemeName | "system"; className?: string }) {
  if (theme === "system") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    );
  }
  // A small filled circle previewing the theme's canvas + accent.
  const preview: Record<ThemeName, { bg: string; dot: string }> = {
    light: { bg: "#faf9f7", dot: "#9a5b1e" },
    dark: { bg: "#16130f", dot: "#e0a458" },
    night: { bg: "#09090b", dot: "#7dd3fc" },
    paper: { bg: "#f6f1e7", dot: "#7c5a2b" },
  };
  const p = preview[theme];
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill={p.bg} stroke="currentColor" strokeOpacity="0.35" />
      <circle cx="12" cy="12" r="3.5" fill={p.dot} />
    </svg>
  );
}

export default function ThemeToggle({ lang = "en" }: { lang?: "es" | "en" }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const label = lang === "es" ? "Tema" : "Theme";
  const current = (theme ?? "system") as ThemeName | "system";
  const options: Array<ThemeName | "system"> = ["system", ...THEMES];

  if (!mounted) {
    return (
      <button type="button" suppressHydrationWarning aria-label={label} className="btn-icon">
        <SwatchIcon theme="system" className="h-4 w-4 opacity-70" />
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        className="btn-icon"
      >
        <SwatchIcon theme={current === "system" ? "system" : (current as ThemeName)} className="h-4 w-4" />
      </button>

      {open && (
        <div role="menu" aria-label={label} className="surface absolute right-0 top-11 z-50 min-w-40 p-1 animate-toast-in">
          {options.map((opt) => {
            const active = current === opt;
            return (
              <button
                key={opt}
                role="menuitemradio"
                aria-checked={active}
                type="button"
                onClick={() => {
                  setTheme(opt);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className={[
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  active ? "bg-accent-soft text-ink font-medium" : "text-ink-muted hover:bg-surface-soft hover:text-ink",
                ].join(" ")}
              >
                <SwatchIcon theme={opt} className="h-4 w-4 shrink-0" />
                <span className="flex-1">{THEME_LABELS[opt][lang]}</span>
                {active && (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
