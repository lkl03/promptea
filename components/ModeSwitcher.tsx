// components/ModeSwitcher.tsx
//
// v1.3.0 two-mode switcher. Server-renderable: plain links between the two
// route-addressable experiences, styled as a segmented control. Links (not
// buttons) so refresh, back/forward, and deep links all work for free, and
// keyboard users get native focus + Enter activation.

import Link from "next/link";
import type { AppMode } from "@/lib/domain";
import type { ModeDict } from "@/lib/uiDict";

export default function ModeSwitcher({
  lang,
  active,
  dict,
}: {
  lang: "es" | "en";
  active: AppMode;
  dict: ModeDict;
}) {
  const items: Array<{ mode: AppMode; href: string; label: string; hint: string }> = [
    { mode: "improve", href: `/${lang}`, label: dict.improveLabel, hint: dict.improveHint },
    { mode: "best-ai", href: `/${lang}/best-ai`, label: dict.bestAiLabel, hint: dict.bestAiHint },
  ];

  const activeItem = items.find((item) => item.mode === active) ?? items[0];

  return (
    <div className="mx-auto w-full max-w-xl">
      <nav aria-label={dict.switcherAria} className="mode-switch w-full">
        {items.map((item) => (
          <Link
            key={item.mode}
            href={item.href}
            aria-current={item.mode === active ? "true" : undefined}
            className="mode-switch-item"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <p className="mt-2 text-center text-xs text-ink-muted">{activeItem.hint}</p>
    </div>
  );
}
