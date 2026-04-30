// components/PromptOfTheDay.tsx
import Link from "next/link";
import { categoryLabel, getDailyPrompt } from "@/lib/prompts/daily";
import { buildPrefillHref } from "@/lib/seo/prefill";

export default function PromptOfTheDay({ lang }: { lang: "es" | "en" }) {
  const today = new Date();
  const daily = getDailyPrompt(today);

  const heading = lang === "es" ? "Prompt del día" : "Prompt of the day";
  const tryLabel = lang === "es" ? "Probar este prompt" : "Try this prompt";
  const dateLabel = today.toLocaleDateString(lang === "es" ? "es-AR" : "en-US", {
    month: "short",
    day: "numeric",
  });

  const promptText = daily.prompt[lang];
  const titleText = daily.title[lang];
  const tryHref = buildPrefillHref({
    lang,
    prompt: promptText,
    purpose: daily.purpose,
    target: daily.target,
  });

  return (
    <details
      className="group relative w-full xl:sticky xl:top-24"
      open
      data-testid="prompt-of-the-day"
    >
      <summary
        className={[
          "list-none cursor-pointer surface p-3 sm:p-4",
          "rotate-[-0.5deg]",
          "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)]",
          "border-amber-300/60 dark:border-amber-200/15",
          "bg-amber-50/80 dark:bg-amber-200/[0.03]",
          "text-amber-950 dark:text-amber-100/90",
          "transition-transform group-open:rotate-0",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider opacity-80">
            <span aria-hidden>📌</span>
            <span>{heading}</span>
          </div>
          <span className="text-[11px] opacity-70">{dateLabel}</span>
        </div>

        <div className="mt-2 text-sm font-medium">{titleText}</div>
        <div className="mt-1 text-[11px] opacity-70">{categoryLabel(daily.category, lang)}</div>
      </summary>

      <div
        className={[
          "mt-2 p-3 sm:p-4 surface-soft",
          "border-amber-300/60 dark:border-amber-200/15",
          "bg-amber-50/60 dark:bg-amber-200/[0.02]",
        ].join(" ")}
      >
        <pre className="whitespace-pre-wrap text-xs leading-relaxed font-body opacity-90 max-h-72 overflow-auto">
{promptText}
        </pre>

        <div className="mt-3 flex items-center justify-end">
          <Link
            href={tryHref}
            prefetch={false}
            className="btn btn-primary h-9 text-xs"
            aria-label={tryLabel}
          >
            {tryLabel}
          </Link>
        </div>
      </div>
    </details>
  );
}
