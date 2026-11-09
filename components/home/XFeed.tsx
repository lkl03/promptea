"use client";

// components/home/XFeed.tsx
//
// v1.8.0 — the official X timeline embed, behind a facade.
//
// Third-party scripts are the usual cause of slow first renders, layout shift
// and privacy surprises, so nothing from X is requested until the visitor asks
// for it:
//
//   1. First render: a static card (heading, a one-line privacy note, a
//      "Load the feed" button and a plain link to the profile). No script, no
//      iframe, no cookies. It reserves exactly the height the loaded timeline
//      will use (FEED_HEIGHT), so loading it causes no layout shift.
//   2. On click: https://platform.twitter.com/widgets.js is added once and the
//      timeline is created into the reserved box, themed light/dark from the
//      active Promptea theme.
//   3. If the script is blocked, errors, or nothing appears within a timeout,
//      the box shows a graceful fallback: the profile link + "Follow us".
//
// The handle comes from NEXT_PUBLIC_X_HANDLE / NEXT_PUBLIC_X_URL (lib/social.ts);
// the page does not render this section without one.

import { useEffect, useRef, useState } from "react";

type Dict = { title: string; subtitle: string; load: string; loading: string; privacyNote: string; fallback: string; open: string; follow: string };

/** Fixed height (px) of the box, before and after loading. */
export const FEED_HEIGHT = 520;
const LOAD_TIMEOUT_MS = 9000;
const WIDGETS_SRC = "https://platform.twitter.com/widgets.js";

type Twttr = { widgets?: { createTimeline: (src: { sourceType: "profile"; screenName: string }, el: HTMLElement, opts: Record<string, unknown>) => Promise<HTMLElement | undefined> } };

function loadWidgets(): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { twttr?: Twttr };
    if (w.twttr?.widgets) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${WIDGETS_SRC}"]`);
    const s = existing ?? document.createElement("script");
    s.addEventListener("load", () => resolve(), { once: true });
    s.addEventListener("error", () => reject(new Error("blocked")), { once: true });
    if (!existing) {
      s.src = WIDGETS_SRC;
      s.async = true;
      s.charset = "utf-8";
      document.head.appendChild(s);
    }
  });
}

/** Dark when the active theme is dark: Metro always, Glass when the system prefers dark. */
function embedTheme(): "light" | "dark" {
  const t = document.documentElement.dataset.theme;
  if (t === "metro") return "dark";
  if (t === "glass") return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  return "light";
}

type State = "idle" | "loading" | "ready" | "failed";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.3L6.5 22H3.4l7.3-8.4L1 2h6.4l4.4 5.6L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z" />
    </svg>
  );
}

export default function XFeed({ handle, profileUrl, dict }: { handle: string; profileUrl: string; dict: Dict }) {
  const [state, setState] = useState<State>("idle");
  const hostRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  async function load() {
    setState("loading");
    timer.current = window.setTimeout(() => setState((s) => (s === "loading" ? "failed" : s)), LOAD_TIMEOUT_MS);
    try {
      await loadWidgets();
      const host = hostRef.current;
      const twttr = (window as unknown as { twttr?: Twttr }).twttr;
      if (!host || !twttr?.widgets) throw new Error("unavailable");
      host.innerHTML = "";
      const el = await twttr.widgets.createTimeline({ sourceType: "profile", screenName: handle }, host, {
        theme: embedTheme(),
        height: FEED_HEIGHT - 2,
        dnt: true,
        chrome: "noheader nofooter transparent",
        lang: document.documentElement.lang === "en" ? "en" : "es",
      });
      if (timer.current) window.clearTimeout(timer.current);
      setState(el ? "ready" : "failed");
    } catch {
      if (timer.current) window.clearTimeout(timer.current);
      setState("failed");
    }
  }

  return (
    <section aria-labelledby="xfeed-title" className="surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="xfeed-title" className="flex items-center gap-2 font-title text-xl font-semibold sm:text-2xl">
            <XIcon className="h-5 w-5" />
            {dict.title}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{dict.subtitle}</p>
        </div>
        <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost h-9 px-4">
          {dict.follow}
        </a>
      </div>

      {/* The box has the same height in every state: loading it shifts nothing. */}
      <div className="relative mt-4 overflow-hidden rounded-xl border border-line" style={{ height: FEED_HEIGHT }}>
        {/* The embed renders into this host; it is mounted from the first render so React never owns its children. */}
        <div ref={hostRef} className="absolute inset-0 overflow-y-auto" hidden={state !== "ready"} />

        {state === "idle" || state === "loading" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="max-w-md text-sm leading-relaxed text-ink-muted">{dict.privacyNote}</p>
            <button type="button" onClick={load} disabled={state === "loading"} aria-busy={state === "loading"} className="btn btn-primary h-10 px-5">
              {state === "loading" ? dict.loading : dict.load.replace("{handle}", handle)}
            </button>
          </div>
        ) : null}

        {state === "failed" ? (
          <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="max-w-md text-sm leading-relaxed text-ink-muted">{dict.fallback}</p>
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary h-10 px-5">
              {dict.open.replace("{handle}", handle)}
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
