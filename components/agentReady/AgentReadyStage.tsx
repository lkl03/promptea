"use client";

// components/agentReady/AgentReadyStage.tsx
//
// v1.9.0 — the Agent-Ready experience: canvas → live scan → result.
//
//   idle      the drop canvas;
//   scanning  POST /api/agent-ready/scan streams events; they are played at a
//             readable pace into the pipeline (all at once under reduced motion);
//   result    the score, the two-reader view, the findings board and the
//             "connect your agent" step.
//
// A saved audit is addressed by `?s=<session id>`: the page restores it on load,
// and while it is open it re-reads the session every few seconds, so fixes the
// person's agent marks done (or a recheck it runs) show up here without a reload.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { orderedFixIds, type AuditSession } from "@/lib/agentReady/session";
import type { Audit, CheckId, CheckStatus, ProbeKey, ScanEvent } from "@/lib/agentReady/types";
import { trackProductEvent } from "@/lib/analytics/productEvents";
import type { Lang } from "@/lib/domain";
import type { AgentReadyDict } from "@/lib/uiDict";
import ConnectAgent from "./ConnectAgent";
import DropCanvas from "./DropCanvas";
import DualView from "./DualView";
import FindingsBoard from "./FindingsBoard";
import ScanPipeline, { type ProbeState } from "./ScanPipeline";
import ScoreHeader from "./ScoreHeader";
import { copyText, hostOf, useReducedMotion, type SessionState } from "./shared";

type Phase = "idle" | "scanning" | "result";
type StreamEvent = ScanEvent | { type: "done"; audit: Audit; sessionId: string | null };

const PACE = { probe: 85, check: 55 } as const;
const POLL_MS = 8000;
const SESSION_RE = /^[A-Za-z0-9_-]{22}$/;

function errorMessage(dict: AgentReadyDict, code: string): string {
  const e = dict.errors;
  if (code === "rate_limited") return e.rate_limited;
  if (code === "target_busy") return e.target_busy;
  if (code === "client_quota" || code === "global_quota") return e.quota;
  if (code === "invalid_url" || code === "validation_error" || code === "bad_redirect") return e.invalid_url;
  if (code.startsWith("blocked_")) return e.blocked;
  if (code === "dns_failed") return e.dns_failed;
  if (code === "timeout") return e.timeout;
  if (code === "network" || code === "too_many_redirects") return e.network;
  return e.scan_failed;
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

export default function AgentReadyStage({ dict, lang }: { dict: AgentReadyDict; lang: Lang }) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [probes, setProbes] = useState<Partial<Record<ProbeKey, ProbeState>>>({});
  const [checks, setChecks] = useState<Partial<Record<CheckId, CheckStatus>>>({});
  const [audit, setAudit] = useState<Audit | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<SessionState>({ plan: [], progress: {} });
  const [toast, setToast] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const reducedRef = useRef(reduced);
  const stageRef = useRef<HTMLDivElement | null>(null);
  // Writes in flight: a poll that started before them must not overwrite what the person just did.
  const dirtyRef = useRef(0);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  const applySession = useCallback((s: AuditSession) => {
    setAudit(s.audit);
    setState({ plan: s.plan, progress: s.progress });
  }, []);

  const setUrlParam = (id: string | null) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("s", id);
    else url.searchParams.delete("s");
    window.history.replaceState(null, "", url);
  };

  const scan = useCallback(
    async (url: string) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setError(null);
      setTarget(url);
      setProbes({});
      setChecks({});
      setPhase("scanning");
      stageRef.current?.scrollIntoView({ block: "nearest", behavior: reducedRef.current ? "auto" : "smooth" });

      const fail = (code: string) => {
        if (ac.signal.aborted) return;
        setError(errorMessage(dict, code));
        setPhase(audit ? "result" : "idle");
      };

      let res: Response;
      try {
        res = await fetch("/api/agent-ready/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }), signal: ac.signal });
      } catch {
        return fail("network");
      }
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
        return fail(body?.code ?? body?.error ?? "scan_failed");
      }

      // Read the stream into a queue; play the queue at a pace a person can follow.
      const queue: StreamEvent[] = [];
      let ended = false;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const pump = (async () => {
        let buffer = "";
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) if (line.trim()) queue.push(JSON.parse(line) as StreamEvent);
          }
        } catch {
          /* aborted or cut: the player reports it */
        } finally {
          ended = true;
        }
      })();

      for (;;) {
        if (ac.signal.aborted) return;
        const event = queue.shift();
        if (!event) {
          if (ended) return fail("scan_failed");
          await sleep(30);
          continue;
        }
        if (event.type === "start") setTarget(event.url);
        else if (event.type === "probe") {
          setProbes((p) => ({ ...p, [event.key]: { ok: event.ok, status: event.status } }));
          if (!reducedRef.current) await sleep(PACE.probe);
        } else if (event.type === "check") {
          setChecks((c) => ({ ...c, [event.result.id]: event.result.status }));
          if (!reducedRef.current) await sleep(PACE.check);
        } else if (event.type === "error") {
          return fail(event.code);
        } else if (event.type === "done") {
          if (!reducedRef.current) await sleep(350);
          if (ac.signal.aborted) return;
          const id = "sessionId" in event ? event.sessionId : null;
          setAudit(event.audit);
          setSessionId(id);
          setState({ plan: [], progress: {} });
          setUrlParam(id);
          setPhase("result");
          trackProductEvent({ name: "Site Audited", lang, level: event.audit.level });
          await pump;
          return;
        }
      }
    },
    [audit, dict, lang],
  );

  // Restore a saved audit from ?s=<id>, once.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    const id = new URL(window.location.href).searchParams.get("s");
    if (!id || !SESSION_RE.test(id)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/agent-ready/session/${id}`, { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          setError(dict.errors.session_gone);
          setUrlParam(null);
          return;
        }
        const s = (await res.json()) as AuditSession;
        applySession(s);
        setSessionId(s.id);
        setTarget(s.audit.pageUrl);
        setPhase("result");
      } catch {
        /* offline: stay on the canvas */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySession, dict.errors.session_gone]);

  // Follow the session while the result is on screen (the agent's progress, a recheck).
  useEffect(() => {
    if (phase !== "result" || !sessionId) return;
    let stopped = false;
    const tick = async () => {
      if (stopped || document.visibilityState !== "visible" || dirtyRef.current > 0) return;
      try {
        const res = await fetch(`/api/agent-ready/session/${sessionId}`, { cache: "no-store" });
        if (!res.ok || stopped || dirtyRef.current > 0) return;
        applySession((await res.json()) as AuditSession);
      } catch {
        /* try again on the next tick */
      }
    };
    const timer = window.setInterval(tick, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [phase, sessionId, applySession]);

  const patch = useCallback(
    async (body: { plan?: CheckId[]; progress?: { id: CheckId; done: boolean } }) => {
      if (!sessionId) return;
      dirtyRef.current += 1;
      try {
        await fetch(`/api/agent-ready/session/${sessionId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      } catch {
        /* kept locally; the next change sends the whole plan again */
      } finally {
        dirtyRef.current -= 1;
      }
    },
    [sessionId],
  );

  const onPlanChange = (plan: CheckId[]) => {
    setState((s) => ({ ...s, plan }));
    void patch({ plan });
  };
  const onToggleDone = (id: CheckId, done: boolean) => {
    setState((s) => ({ ...s, progress: { ...s.progress, [id]: { done, at: new Date().toISOString() } } }));
    void patch({ progress: { id, done } });
  };

  const order = useMemo(() => (audit ? orderedFixIds({ audit, plan: state.plan }) : []), [audit, state.plan]);
  const doneCount = order.filter((id) => state.progress[id]?.done).length;

  const reset = () => {
    abortRef.current?.abort();
    setAudit(null);
    setSessionId(null);
    setState({ plan: [], progress: {} });
    setError(null);
    setUrlParam(null);
    setPhase("idle");
  };

  const share = async () => {
    if (await copyText(window.location.href)) {
      setToast(dict.score.linkCopied);
      window.setTimeout(() => setToast(null), 2000);
    }
  };

  return (
    <div ref={stageRef} className="ar-stage scroll-mt-6">
      {phase === "idle" ? <DropCanvas dict={dict} error={error} initialUrl={target ? hostOf(target) : ""} onScan={scan} onError={setError} /> : null}

      {phase === "scanning" ? <ScanPipeline dict={dict} site={hostOf(target)} probes={probes} checks={checks} /> : null}

      {phase === "result" && audit ? (
        <div className="space-y-5">
          {error ? (
            <p role="alert" className="surface-soft border-danger px-4 py-3 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <ScoreHeader dict={dict} audit={audit} lang={lang} canShare={Boolean(sessionId)} busy={false} onRescan={() => scan(audit.pageUrl)} onNew={reset} onShare={share} />
          <DualView dict={dict} audit={audit} />
          <FindingsBoard dict={dict} audit={audit} state={state} canMark={Boolean(sessionId)} onPlanChange={onPlanChange} onToggleDone={onToggleDone} />
          <ConnectAgent dict={dict} lang={lang} audit={audit} sessionId={sessionId} order={order} doneCount={doneCount} />
        </div>
      ) : null}

      <p aria-live="polite" className={toast ? "fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-line bg-surface-raised px-4 py-2 text-sm shadow-lg" : "sr-only"}>
        {toast}
      </p>
    </div>
  );
}
