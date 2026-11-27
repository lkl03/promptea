"use client";

// components/agentReady/ConnectAgent.tsx
//
// v1.9.0 — the step that replaces "copy this prompt": the audit is saved, and
// the person's coding agent connects to it through Promptea's MCP server with
// one command. Formats checked against each client's docs on 2026-11-27:
//   Claude Code  claude mcp add --transport http <name> <url>
//   Codex        [mcp_servers.<name>] url = "…" in ~/.codex/config.toml
//   Cursor       .cursor/mcp.json, or the cursor:// install link
// The copyable prompt stays as the fallback for an AI without MCP.

import { useId, useState } from "react";

import type { Audit, CheckId } from "@/lib/agentReady/types";
import { trackProductEvent } from "@/lib/analytics/productEvents";
import type { Lang } from "@/lib/domain";
import { STUDIO_URL } from "@/lib/seo/site";
import type { AgentReadyDict } from "@/lib/uiDict";
import { copyText, fmt } from "./shared";

const SERVER = "promptea-audit";
type Client = "claude" | "codex" | "cursor";
const CLIENTS: Array<{ id: Client; label: string }> = [
  { id: "claude", label: "Claude Code" },
  { id: "codex", label: "Codex" },
  { id: "cursor", label: "Cursor" },
];

function snippet(client: Client, url: string): string {
  if (client === "claude") return `claude mcp add --transport http ${SERVER} ${url}`;
  if (client === "codex") return `[mcp_servers.${SERVER}]\nurl = "${url}"`;
  return JSON.stringify({ mcpServers: { [SERVER]: { url } } }, null, 2);
}

type Props = {
  dict: AgentReadyDict;
  lang: Lang;
  audit: Audit;
  sessionId: string | null;
  /** The fixes in the order they will be worked on. */
  order: CheckId[];
  doneCount: number;
};

export default function ConnectAgent({ dict, lang, audit, sessionId, order, doneCount }: Props) {
  const t = dict.connect;
  const [client, setClient] = useState<Client>("claude");
  const [copied, setCopied] = useState<string | null>(null);
  const id = useId();
  const url = sessionId && typeof window !== "undefined" ? `${window.location.origin}/api/mcp/${sessionId}` : "";
  const code = snippet(client, url);
  const hint = client === "claude" ? t.claudeHint : client === "codex" ? t.codexHint : t.cursorHint;
  const cursorLink = url ? `cursor://anysphere.cursor-deeplink/mcp/install?name=${SERVER}&config=${encodeURIComponent(btoa(JSON.stringify({ url })))}` : "";

  const flash = (key: string) => {
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
  };

  const copyCommand = async () => {
    if (await copyText(code)) {
      flash("command");
      trackProductEvent({ name: "Agent Connected", lang, client });
    }
  };

  const copyPrompt = async () => {
    // The catalog is only needed here, so it stays out of the page's first load.
    const { buildFixPrompt } = await import("@/lib/agentReady/prompt");
    if (await copyText(buildFixPrompt(audit, order))) {
      flash("prompt");
      trackProductEvent({ name: "Agent Connected", lang, client: "prompt" });
    }
  };

  return (
    <section className="surface ar-reveal p-4 sm:p-6" style={{ ["--i" as string]: 3 }} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="font-title text-xl font-semibold">
        {t.title}
      </h2>

      {sessionId ? (
        <>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-muted">{t.lead}</p>

          <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="min-w-0">
              <div role="tablist" aria-label={t.tabsAria} className="inline-flex gap-1 rounded-xl border border-line bg-surface-soft p-0.5">
                {CLIENTS.map((c) => (
                  <button key={c.id} type="button" role="tab" id={`${id}-tab-${c.id}`} aria-selected={client === c.id} aria-controls={`${id}-panel`} className="ar-tab" onClick={() => setClient(c.id)}>
                    {c.label}
                  </button>
                ))}
              </div>
              <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${client}`} className="mt-3">
                <pre className="ar-code" tabIndex={0}>
                  <code>{code}</code>
                </pre>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" className="btn btn-primary h-9" onClick={copyCommand}>
                    {copied === "command" ? t.copied : t.copy}
                  </button>
                  {client === "cursor" ? (
                    <a className="btn btn-ghost h-9" href={cursorLink}>
                      {t.cursorInstall}
                    </a>
                  ) : null}
                  <span aria-live="polite" className="sr-only">
                    {copied ? t.copied : ""}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-muted">{hint}</p>
                <p className="mt-1 text-xs text-ink-faint">{t.secret}</p>
              </div>
            </div>

            <div className="min-w-0">
              <ol className="m-0 list-none space-y-2 p-0">
                {t.steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className="ar-plan-num">{i + 1}</span>
                    <span className="min-w-0 text-ink-muted">{step}</span>
                  </li>
                ))}
              </ol>
              {order.length > 0 ? (
                <div className="surface-soft mt-4 p-3">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium" role="status">
                      {fmt(t.progress, { done: doneCount, total: order.length })}
                    </span>
                    <span className="text-xs text-ink-faint">{t.live}</span>
                  </div>
                  <div className="ar-bar mt-2" aria-hidden="true">
                    <span style={{ ["--v" as string]: `${(doneCount / order.length) * 100}%`, ["--bar" as string]: "var(--success)" }} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-muted">{t.noSession}</p>
      )}

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{t.fallbackTitle}</h3>
          <p className="mt-0.5 text-xs text-ink-muted">{t.fallbackBody}</p>
        </div>
        <button type="button" className="btn btn-ghost h-9 shrink-0" onClick={copyPrompt} disabled={order.length === 0}>
          {copied === "prompt" ? t.copied : t.copyPrompt}
        </button>
      </div>

      <p className="mt-4 text-xs text-ink-faint">
        {t.services}{" "}
        <a href={STUDIO_URL} target="_blank" rel="noopener" className="font-medium text-accent-ink underline-offset-4 hover:underline">
          {t.servicesCta}
        </a>
      </p>
    </section>
  );
}
