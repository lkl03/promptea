"use client";

// components/agentReady/DualView.tsx
//
// v1.9.0 — the same page for two readers. Left: what a person gets — a
// schematic of the page drawn from its HTML, with the option of loading the
// real site in a sandboxed frame when it allows being embedded. Right: what a
// non-rendering agent gets — the text that is in the HTML, or the page's own
// markdown — and what each costs it in tokens.
//
// The text on the right comes from the audited page. It is rendered as plain
// text (React escapes it; nothing is injected as HTML) and labelled as such.

import { useId, useRef, useState } from "react";

import type { Audit } from "@/lib/agentReady/types";
import type { AgentReadyDict } from "@/lib/uiDict";
import { fmt, hostOf } from "./shared";

const LANDMARKS = ["header", "nav", "main", "footer"] as const;

function Wireframe({ audit, dict }: { audit: Audit; dict: AgentReadyDict }) {
  const h = audit.humanView;
  const w = dict.views.wire;
  const has = (n: string) => h.landmarks.includes(n);
  return (
    <div className="ar-wire" aria-hidden="true">
      {LANDMARKS.filter((n) => n !== "main" && n !== "footer").map((n) => (
        <div key={n} className="ar-wire-block" data-missing={!has(n)}>
          &lt;{n}&gt;
        </div>
      ))}
      <div className="ar-wire-block ar-wire-main" data-missing={!has("main")}>
        <span>&lt;main&gt;</span>
        <span className="ar-wire-line" style={{ width: "72%" }} />
        <span className="ar-wire-line" style={{ width: "94%" }} />
        <span className="ar-wire-line" style={{ width: "58%" }} />
        <span className="mt-auto flex flex-wrap gap-1.5 pt-2">
          <span className="badge badge-neutral">
            {h.images} {w.images}
          </span>
          <span className="badge badge-neutral">
            {h.scripts} {w.scripts}
          </span>
          <span className="badge badge-neutral">
            {h.forms} {w.forms}
          </span>
        </span>
      </div>
      <div className="ar-wire-block" data-missing={!has("footer")}>
        &lt;footer&gt;
      </div>
    </div>
  );
}

export default function DualView({ dict, audit }: { dict: AgentReadyDict; audit: Audit }) {
  const t = dict.views;
  const a = audit.agentView;
  const h = audit.humanView;
  const [split, setSplit] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [live, setLive] = useState(false);
  const [tab, setTab] = useState<"html" | "markdown">(a.markdown ? "markdown" : "html");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const tabsId = useId();
  const site = hostOf(audit.pageUrl);
  const clamp = (v: number) => Math.min(72, Math.max(28, v));

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !wrapRef.current) return;
    const box = wrapRef.current.getBoundingClientRect();
    setSplit(clamp(((e.clientX - box.left) / box.width) * 100));
  };

  const maxTokens = Math.max(a.htmlTokens, 1);
  const bars: Array<{ key: "html" | "text" | "markdown"; tokens: number | null }> = [
    { key: "html", tokens: a.htmlTokens },
    { key: "text", tokens: a.textTokens },
    { key: "markdown", tokens: a.markdownTokens },
  ];
  const shownText = tab === "markdown" && a.markdown ? a.markdown : a.text;
  const nf = new Intl.NumberFormat();

  return (
    <section className="surface ar-reveal p-4 sm:p-6" style={{ ["--i" as string]: 1 }} aria-labelledby={`${tabsId}-title`}>
      <h2 id={`${tabsId}-title`} className="font-title text-xl font-semibold">
        {t.title}
      </h2>

      <div ref={wrapRef} className="ar-split mt-4" style={{ ["--split" as string]: split }} onPointerMove={onPointerMove} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}>
        <div className="ar-pane">
          <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t.human}</h3>
            {h.frameable && !live ? (
              <button type="button" className="pill" onClick={() => setLive(true)}>
                {fmt(t.livePreview, { site })}
              </button>
            ) : null}
          </div>
          <div className="ar-pane-body" style={{ overflow: live ? "hidden" : undefined }}>
            {live ? (
              // No allow-same-origin: the framed site runs in an opaque origin and cannot navigate this page.
              <iframe className="ar-frame" src={audit.pageUrl} title={fmt(t.livePreview, { site })} sandbox="allow-scripts" referrerPolicy="no-referrer" loading="lazy" />
            ) : (
              <Wireframe audit={audit} dict={dict} />
            )}
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            {!h.frameable ? `${t.blockedPreview} ` : ""}
            {Math.round(h.textRatio * 100)}% {t.wire.textShare}
            {h.images > 0 ? ` · ${h.imagesWithAlt}/${h.images} ${t.wire.images} ${t.wire.withAlt}` : ""}
          </p>
        </div>

        <div
          className="ar-split-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label={t.resize}
          aria-valuemin={28}
          aria-valuemax={72}
          aria-valuenow={Math.round(split)}
          tabIndex={0}
          data-dragging={dragging}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setSplit((v) => clamp(v - 4));
            else if (e.key === "ArrowRight") setSplit((v) => clamp(v + 4));
            else if (e.key === "Home") setSplit(28);
            else if (e.key === "End") setSplit(72);
            else return;
            e.preventDefault();
          }}
        />

        <div className="ar-pane">
          <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{t.agent}</h3>
            <div role="tablist" aria-label={t.tabsAria} className="flex gap-1 rounded-xl border border-line bg-surface-soft p-0.5">
              <button type="button" role="tab" id={`${tabsId}-html`} aria-selected={tab === "html"} aria-controls={`${tabsId}-panel`} className="ar-tab" onClick={() => setTab("html")}>
                {t.tabHtml}
              </button>
              <button type="button" role="tab" id={`${tabsId}-markdown`} aria-selected={tab === "markdown"} aria-controls={`${tabsId}-panel`} className="ar-tab" disabled={!a.markdown} onClick={() => setTab("markdown")}>
                {t.tabMarkdown}
              </button>
            </div>
          </div>
          <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-${tab}`} className="ar-pane-body" tabIndex={0}>
            {shownText.trim() ? <pre className="ar-agent-text">{shownText}</pre> : <p className="p-4 text-sm text-ink-muted">{t.noText}</p>}
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            {fmt(t.words, { n: nf.format(a.words) })} · {t.untrusted}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{t.tokensTitle}</h3>
          <ul className="m-0 mt-2 list-none space-y-2.5 p-0">
            {bars.map((b) => (
              <li key={b.key}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span>{t.tokens[b.key]}</span>
                  <span className="text-ink-muted tabular-nums">{b.tokens === null ? t.noMarkdown : fmt(t.tokensUnit, { n: nf.format(b.tokens) })}</span>
                </div>
                <div className="ar-bar mt-1" aria-hidden="true">
                  <span style={{ ["--v" as string]: `${b.tokens === null ? 0 : Math.max(2, (b.tokens / maxTokens) * 100)}%`, ["--bar" as string]: b.key === "html" ? "var(--danger)" : "var(--success)" }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{t.outline}</h3>
          {a.headings.length > 0 ? (
            <ul className="m-0 mt-2 max-h-40 list-none space-y-1 overflow-auto p-0 text-xs" tabIndex={0} aria-label={t.outline}>
              {a.headings.slice(0, 14).map((hd, i) => (
                <li key={i} className="flex gap-2" style={{ paddingInlineStart: `${(hd.level - 1) * 10}px` }}>
                  <span className="shrink-0 font-mono text-ink-faint">h{hd.level}</span>
                  <span className="min-w-0 truncate text-ink-muted">{hd.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-ink-muted">{t.noOutline}</p>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{t.types}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {a.jsonLdTypes.length > 0 ? a.jsonLdTypes.map((ty) => <span key={ty} className="badge badge-accent">{ty}</span>) : <span className="badge badge-neutral">{t.noTypes}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
