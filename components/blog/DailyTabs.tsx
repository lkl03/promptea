// components/blog/DailyTabs.tsx
//
// v1.7.0 — AI Daily's two sections: the daily news index and the weekly
// digest archive. Real links (each section is its own URL, shareable and
// crawlable), styled as a segmented control; the current one carries
// aria-current="page".

import Link from "next/link";
import { weeklyArchivePath } from "@/lib/newsletter/paths";

type Props = {
  lang: "es" | "en";
  active: "news" | "weekly";
  dict: { aria: string; news: string; weekly: string };
};

export default function DailyTabs({ lang, active, dict }: Props) {
  const items = [
    { key: "news" as const, href: `/${lang}/blog`, label: dict.news },
    { key: "weekly" as const, href: weeklyArchivePath(lang), label: dict.weekly },
  ];
  return (
    <nav aria-label={dict.aria} className="flex justify-center">
      <div className="mode-switch">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={item.key === active ? "page" : undefined}
            data-current={item.key === active ? "true" : undefined}
            className="mode-switch-item min-w-32 whitespace-nowrap px-5"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
