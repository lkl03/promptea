// components/blog/DailyTabs.tsx
//
// AI Daily's sections: AI (the daily news index), Tech (v1.8.3: one technology
// story a day) and the weekly digest archive. Real links (each section is its
// own URL, shareable and crawlable), styled as a segmented control; the current
// one carries aria-current="page". Each tab takes the width of its own label:
// three equal tracks cut "Resumen semanal" (at 375 px, and by a pixel or two on
// desktop in Spanish and Portuguese). Short labels keep a minimum width — 44 px
// on phones (touch target), 112 px from `sm` up so the control stays balanced.

import Link from "next/link";
import { weeklyArchivePath } from "@/lib/newsletter/paths";
import { blogIndexPath, blogTechIndexPath } from "@/lib/blog/jsonld";
import { type Lang } from "@/lib/domain";

type Props = {
  lang: Lang;
  /** `null` on a page that belongs to no single tab. */
  active: "news" | "tech" | "weekly" | null;
  dict: { aria: string; news: string; tech: string; weekly: string };
};

export default function DailyTabs({ lang, active, dict }: Props) {
  const items = [
    { key: "news" as const, href: blogIndexPath(lang), label: dict.news },
    { key: "tech" as const, href: blogTechIndexPath(lang), label: dict.tech },
    { key: "weekly" as const, href: weeklyArchivePath(lang), label: dict.weekly },
  ];
  return (
    <nav aria-label={dict.aria} className="flex justify-center">
      <div className="mode-switch max-w-full">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={item.key === active ? "page" : undefined}
            data-current={item.key === active ? "true" : undefined}
            data-daily-tab={item.key}
            className="mode-switch-item min-w-11 flex-none whitespace-nowrap px-3.5 sm:min-w-28 sm:px-5"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
