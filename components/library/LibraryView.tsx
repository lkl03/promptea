"use client";

// components/library/LibraryView.tsx
//
// v1.8.0 — the prompt library page body. Everything here reads and writes the
// browser's localStorage through lib/library/clientStore.ts: no request leaves
// the page, and the privacy notice at the top says so. Features: search,
// favourites filter, copy (optimized / original), delete one or all (two-step,
// inline — no window.confirm), re-analyze, share, auto-save toggle.

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { getLibraryServerSnapshot, getLibrarySnapshot, libraryActions, subscribeLibrary } from "@/lib/library/clientStore";
import { scoreDelta, searchEntries, type LibraryEntry } from "@/lib/library/store";
import { purposeLabel } from "@/lib/purposes";
import { isPurpose } from "@/lib/domain";
import ShareButton, { type ShareDict } from "@/components/share/ShareButton";
import { useToast } from "@/components/ToastProvider";

export type LibraryDict = Record<string, string>;

const TARGET_LABEL: Record<string, string> = { gpt: "GPT", claude: "Claude", gemini: "Gemini", grok: "Grok", kimi: "Kimi", deepseek: "DeepSeek", perplexity: "Perplexity" };

function scoreTone(score: number) {
  return score < 50 ? "text-danger" : score < 75 ? "text-warning" : "text-success";
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3.5 2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 16.9l-5.25 2.8 1-5.85L3.5 9.7l5.9-.9L12 3.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

function EntryCard({ entry, lang, t, shareDict }: { entry: LibraryEntry; lang: "es" | "en"; t: LibraryDict; shareDict: ShareDict }) {
  const toast = useToast();
  const delta = scoreDelta(entry);
  const date = new Intl.DateTimeFormat(lang === "es" ? "es-AR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(entry.createdAt);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.show(t.copied, "success");
    } catch {
      /* clipboard blocked: nothing to do */
    }
  }

  return (
    <li className="surface-soft p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium text-ink">{entry.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
            {isPurpose(entry.purpose) ? <span className="badge badge-neutral">{purposeLabel(entry.purpose, lang)}</span> : null}
            {entry.target ? <span className="badge badge-neutral">{TARGET_LABEL[entry.target] ?? entry.target}</span> : null}
            <time dateTime={new Date(entry.createdAt).toISOString()}>{date}</time>
          </p>
        </div>

        <p className="flex items-baseline gap-2 tabular-nums" aria-label={delta ? `${t.score}: ${delta.before} → ${delta.after}` : `${t.score}: ${entry.score}`}>
          <span className={["font-title text-2xl font-semibold", scoreTone(entry.score)].join(" ")}>{entry.score}</span>
          {delta ? (
            <>
              <span aria-hidden="true" className="text-ink-faint">
                →
              </span>
              <span className={["font-title text-2xl font-semibold", scoreTone(delta.after)].join(" ")}>{delta.after}</span>
              {delta.delta !== 0 ? <span className={["badge", delta.delta > 0 ? "badge-success" : "badge-neutral"].join(" ")}>{delta.delta > 0 ? `+${delta.delta}` : delta.delta}</span> : null}
            </>
          ) : (
            <span className="text-xs font-normal text-ink-faint">{t.noAfter}</span>
          )}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary h-8 px-3 text-xs" onClick={() => copy(entry.optimized || entry.original)}>
          {t.copyOptimized}
        </button>
        <Link href={`/${lang}/analyzer?prompt=${encodeURIComponent(entry.original.slice(0, 1500))}`} className="btn btn-ghost h-8 px-3 text-xs">
          {t.reanalyze}
        </Link>
        <ShareButton
          lang={lang}
          dict={shareDict}
          label={t.share}
          compact
          input={{ score: entry.score, optimizedScore: entry.optimizedScore, breakdown: entry.breakdown, purpose: entry.purpose, target: entry.target }}
        />
        <span className="ml-auto inline-flex items-center gap-1.5">
          <button
            type="button"
            className={["btn-icon h-8 w-8", entry.favorite ? "text-warning" : ""].join(" ")}
            aria-pressed={entry.favorite}
            aria-label={entry.favorite ? t.unfavorite : t.favorite}
            title={entry.favorite ? t.unfavorite : t.favorite}
            onClick={() => libraryActions.toggleFavorite(entry.id)}
          >
            <StarIcon filled={entry.favorite} />
          </button>
          <button type="button" className="btn-icon h-8 w-8" aria-label={t.delete} title={t.delete} onClick={() => libraryActions.remove(entry.id)}>
            <TrashIcon />
          </button>
        </span>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-ink-muted hover:text-ink">{t.showTexts}</summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {[
            { label: t.original, text: entry.original },
            { label: t.optimized, text: entry.optimized },
          ].map((b) => (
            <div key={b.label}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-ink-muted">{b.label}</p>
                <button type="button" className="text-xs text-accent hover:underline" onClick={() => copy(b.text)}>
                  {t.copy}
                </button>
              </div>
              <pre className="prompt-block field mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words p-3">{b.text}</pre>
            </div>
          ))}
        </div>
      </details>
    </li>
  );
}

export default function LibraryView({ lang, t, shareDict }: { lang: "es" | "en"; t: LibraryDict; shareDict: ShareDict }) {
  const lib = useSyncExternalStore(subscribeLibrary, getLibrarySnapshot, getLibraryServerSnapshot);
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const shown = useMemo(() => searchEntries(lib.entries, query, { favoritesOnly }), [lib.entries, query, favoritesOnly]);

  if (!lib.hydrated) {
    return (
      <div className="min-h-[30rem]">
        <p className="surface-soft p-6 text-sm text-ink-muted" role="status">
          {t.loading}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[30rem]">
      <p role="note" className="surface-soft border-l-4 p-4 text-sm leading-relaxed text-ink" style={{ borderLeftColor: "var(--accent)" }}>
        {t.privacy}
      </p>

      {lib.saveFailed ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {t.saveFailed}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-xs text-ink-muted">
          {t.search}
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchPlaceholder} className="field h-10 px-3 text-sm" />
        </label>
        <button type="button" className="pill !h-10" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly((v) => !v)}>
          ★ {t.favoritesOnly}
        </button>
        <label className="flex h-10 items-center gap-2 text-sm text-ink-muted">
          <input type="checkbox" checked={lib.autoSave} onChange={(e) => libraryActions.setAutoSave(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          {t.autoSave}
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted" aria-live="polite">
          {t.count.replace("{n}", String(lib.entries.length))}
        </p>
        {lib.entries.length > 0 ? (
          confirmClear ? (
            <span className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label={t.deleteAll}>
              <span className="text-danger">{t.deleteAllConfirm.replace("{n}", String(lib.entries.length))}</span>
              <button
                type="button"
                className="btn btn-primary h-8 px-3 text-xs"
                style={{ background: "var(--danger)" }}
                onClick={() => {
                  libraryActions.clearAll();
                  setConfirmClear(false);
                }}
              >
                {t.deleteAllYes}
              </button>
              <button type="button" className="btn btn-ghost h-8 px-3 text-xs" onClick={() => setConfirmClear(false)}>
                {t.cancel}
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-ghost h-8 px-3 text-xs" onClick={() => setConfirmClear(true)}>
              {t.deleteAll}
            </button>
          )
        ) : null}
      </div>

      {lib.entries.length === 0 ? (
        <div className="surface mt-6 p-8 text-center">
          <h2 className="font-title text-lg font-semibold">{t.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{t.empty}</p>
          <Link href={`/${lang}/analyzer`} className="btn btn-primary mt-5 h-10 px-5">
            {t.goAnalyze} →
          </Link>
        </div>
      ) : shown.length === 0 ? (
        <p className="surface-soft mt-6 p-6 text-center text-sm text-ink-muted">{t.emptySearch}</p>
      ) : (
        <ul className="mt-4 grid list-none gap-3 p-0">
          {shown.map((e) => (
            <EntryCard key={e.id} entry={e} lang={lang} t={t} shareDict={shareDict} />
          ))}
        </ul>
      )}
    </div>
  );
}
