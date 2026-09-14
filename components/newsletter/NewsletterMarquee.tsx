import Link from "next/link";

export type NewsletterMarqueeDict = {
  text: string;
  cta: string;
};

export default function NewsletterMarquee({
  lang,
  dict,
}: {
  lang: "es" | "en";
  dict: NewsletterMarqueeDict;
}) {
  return (
    <div className="flex justify-center">
      <Link
        href={`/${lang}/weekly`}
        className="inline-flex max-w-full items-center gap-2
                   rounded-full border border-line bg-surface-soft px-3 py-1
                   text-[11px] text-ink-muted
                   hover:border-line-strong hover:text-ink
                   transition-colors"
      >
        <span className="opacity-60">📬</span>
        <span className="truncate opacity-80">{dict.text}</span>
        <span className="shrink-0 font-medium text-accent">{dict.cta} →</span>
      </Link>
    </div>
  );
}
