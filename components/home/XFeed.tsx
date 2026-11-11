"use client";

// components/home/XFeed.tsx
//
// The X feed card (home side column, AI Daily side column).
//
// v1.8.0–v1.8.1 embedded X's own timeline widget behind a click-to-load facade.
// X stopped rendering that embed (the widget created an empty frame, in
// production too), so the card only ever showed its fallback. Since v1.8.1 the
// feed comes from an Elfsight "Twitter Feed" widget instead: Elfsight fetches
// the posts on its side and renders them into this page.
//
// How it loads:
//   - Nothing is requested from Elfsight until the card is near the viewport
//     (IntersectionObserver, 300 px margin). Then https://elfsightcdn.com/platform.js
//     is added once per page and it fills the `elfsight-app-<id>` element.
//     Elfsight's own `data-elfsight-app-lazy` attribute is NOT used: it defers
//     again with a second observer, and inside this scroll box that second
//     wait sometimes never fired (the widget stayed empty). One deferral, ours.
//   - The feed box has a fixed height and scrolls inside, so loading it shifts
//     nothing and the sticky side column keeps its size.
//   - If no post has rendered after LOAD_TIMEOUT_MS (script blocked by the
//     browser or an extension, Elfsight down, the plan's view limit reached),
//     the box shows a link to the profile instead of staying empty.
//
// v1.8.3 (QA):
//   - "Rendered" used to mean "Elfsight put anything in the box". When Elfsight
//     cannot read the account it renders its own English error ("Failed to
//     fetch user data…") plus its badge, which counted as rendered: the card
//     showed a third party's error, in English, in every language, and never
//     fell back. It now counts POSTS (hasPosts below); anything else ends in
//     the translated fallback, and the widget stays invisible until it has posts
//     so its error text never shows through the "Loading…" message.
//   - On desktop the card is on screen from the first paint, so the script used
//     to be requested during hydration (measured in production: 4.55 s, with LCP
//     at 4.54 s and the load event at 4.65 s). It now waits for the load event
//     and an idle moment, so ~165 KB of third-party code never competes with
//     the page's own rendering.
//   - Without JavaScript the box said "Loading the feed…" forever; it now shows
//     the link to the profile (<noscript>).
//
// Which widget: lib/social.ts → getXWidgetId() (NEXT_PUBLIC_ELFSIGHT_X_WIDGET_ID,
// with the Promptea widget as default). Its content (account, number of posts,
// layout) is configured in the Elfsight dashboard, not here. Its look is matched
// to Promptea's three themes in app/globals.css ("X feed (Elfsight)").

import { useEffect, useRef, useState } from "react";

type Dict = { title: string; subtitle: string; loading: string; privacyNote: string; fallback: string; open: string; follow: string };

/** Fixed height (px) of the feed box, before and after loading. */
export const FEED_HEIGHT = 460;
const LOAD_TIMEOUT_MS = 12000;
export const ELFSIGHT_PLATFORM_SRC = "https://elfsightcdn.com/platform.js";

/** Adds Elfsight's platform script once per page. Rejects when the browser could not load it. */
function loadPlatform(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${ELFSIGHT_PLATFORM_SRC}"]`);
    if (existing?.dataset.loaded === "1") return resolve();
    const s = existing ?? document.createElement("script");
    s.addEventListener(
      "load",
      () => {
        s.dataset.loaded = "1";
        resolve();
      },
      { once: true }
    );
    s.addEventListener("error", () => reject(new Error("blocked")), { once: true });
    if (!existing) {
      s.src = ELFSIGHT_PLATFORM_SRC;
      s.async = true;
      document.head.appendChild(s);
    }
  });
}

type State = "idle" | "loading" | "ready" | "failed";

/**
 * True when the widget rendered at least one post. Elfsight's Twitter Feed marks
 * each post with a `…-posts-item` class and links it to its `/status/<id>` URL;
 * either is enough (two signals, so a markup change on their side has to break
 * both before a working feed is mistaken for a failed one).
 */
export function hasPosts(host: ParentNode): boolean {
  return host.querySelector('[class*="posts-item"], a[href*="/status/"]') !== null;
}

/** Runs `fn` once the page has finished loading and the main thread is idle (or after `timeout` ms). */
function whenIdleAfterLoad(fn: () => void, timeout = 2500): () => void {
  let cancelled = false;
  let idleId: number | undefined;
  let timerId: number | undefined;
  const run = () => {
    if (!cancelled) fn();
  };
  const schedule = () => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === "function") idleId = window.requestIdleCallback(run, { timeout });
    else timerId = window.setTimeout(run, 200);
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", schedule);
    if (idleId !== undefined && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleId);
    window.clearTimeout(timerId);
  };
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.3L6.5 22H3.4l7.3-8.4L1 2h6.4l4.4 5.6L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z" />
    </svg>
  );
}

export default function XFeed({ widgetId, handle, profileUrl, dict }: { widgetId: string; handle: string | null; profileUrl: string; dict: Dict }) {
  const [state, setState] = useState<State>("idle");
  const boxRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    const host = hostRef.current;
    if (!box || !host) return;
    let timer: number | undefined;
    let cancelled = false;
    let cancelIdle: (() => void) | undefined;

    // "Ready" = Elfsight rendered posts (not just its badge or its own error message).
    const rendered = () => hasPosts(host);
    const mo = new MutationObserver(() => {
      if (rendered()) {
        window.clearTimeout(timer);
        setState("ready");
      }
    });

    const start = () => {
      if (cancelled) return;
      setState("loading");
      mo.observe(host, { childList: true, subtree: true });
      timer = window.setTimeout(() => setState((s) => (s === "ready" || rendered() ? "ready" : "failed")), LOAD_TIMEOUT_MS);
      loadPlatform().catch(() => {
        window.clearTimeout(timer);
        if (!cancelled) setState("failed");
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          // Never during the first render: after the load event, when the main thread is idle.
          cancelIdle = whenIdleAfterLoad(start);
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(box);

    return () => {
      cancelled = true;
      cancelIdle?.();
      io.disconnect();
      mo.disconnect();
      window.clearTimeout(timer);
    };
  }, [widgetId]);

  return (
    <section aria-labelledby="xfeed-title" className="surface p-4 sm:p-5">
      {/* Title and handle share a row when they fit; in a narrow column the handle wraps under the title. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id="xfeed-title" className="flex items-center gap-2 whitespace-nowrap font-title text-lg font-semibold">
          <XIcon className="h-4 w-4 shrink-0" />
          {dict.title}
        </h2>
        <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost h-8 shrink-0 px-3 text-xs">
          {handle ? `@${handle}` : dict.follow}
          {handle ? <span className="sr-only"> — {dict.follow}</span> : null}
        </a>
      </div>
      <p className="mt-1 text-sm text-ink-muted">{dict.subtitle}</p>

      {/* Same height in every state: loading the feed shifts nothing. The posts scroll inside. */}
      <div ref={boxRef} className="x-feed-box relative mt-3 overflow-hidden rounded-xl border border-line" style={{ height: FEED_HEIGHT }}>
        <div
          className="x-feed-scroll absolute inset-0 overflow-y-auto overscroll-contain"
          tabIndex={state === "ready" ? 0 : -1}
          role="region"
          aria-label={dict.title}
          hidden={state === "failed"}
          // Invisible and inert until there are posts: whatever the widget prints while loading
          // or failing never shows through. Opacity, not `visibility`: the widget's badge sets
          // its own `visibility: visible`, which a hidden ancestor cannot override.
          aria-hidden={state === "ready" ? undefined : true}
          inert={state === "ready" ? undefined : true}
          style={state === "ready" ? undefined : { opacity: 0, pointerEvents: "none" }}
        >
          {/* Elfsight renders into this element; React never owns its children. */}
          <div ref={hostRef} className={`elfsight-app-${widgetId}`} style={{ minHeight: 1 }} suppressHydrationWarning />
        </div>

        {state === "idle" || state === "loading" ? (
          <p role="status" data-x-feed-loading className="pointer-events-none absolute inset-0 flex items-center justify-center p-5 text-center text-sm text-ink-muted">
            {dict.loading}
          </p>
        ) : null}

        {/* Without JavaScript the widget can never load: show the way to the profile instead of "Loading…". */}
        <noscript>
          <style>{"[data-x-feed-loading]{display:none}"}</style>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-5 text-center">
            <p className="max-w-xs text-sm leading-relaxed text-ink-muted">{dict.fallback}</p>
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary h-10 px-4 text-sm">
              {handle ? dict.open.replace("{handle}", handle) : dict.follow}
            </a>
          </div>
        </noscript>

        {state === "failed" ? (
          <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-5 text-center">
            <p className="max-w-xs text-sm leading-relaxed text-ink-muted">{dict.fallback}</p>
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary h-10 px-4 text-sm">
              {handle ? dict.open.replace("{handle}", handle) : dict.follow}
            </a>
          </div>
        ) : null}
      </div>

      <p className="mt-2 text-[11px] leading-snug text-ink-muted">{dict.privacyNote}</p>
    </section>
  );
}
