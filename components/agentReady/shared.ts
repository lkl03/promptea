"use client";

// components/agentReady/shared.ts — small client helpers shared by the Agent-Ready components.

import { useEffect, useState } from "react";

import type { AuditSession } from "@/lib/agentReady/session";
import { CHECK_IDS, type Audit, type CheckId, type CheckResult } from "@/lib/agentReady/types";

/** "{n} of {total}" with values filled in. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** True when the visitor asked for reduced motion. False during SSR and the first paint. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

export const hostOf = (url: string): string => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export const openChecks = (audit: Audit): CheckResult[] => audit.checks.filter((c) => c.status !== "pass");

/** Open checks not in the plan, most points to gain first (the order the MCP server uses). */
export function unplanned(audit: Audit, plan: readonly CheckId[]): CheckResult[] {
  return openChecks(audit)
    .filter((c) => !plan.includes(c.id))
    .sort((a, b) => b.weight - b.points - (a.weight - a.points) || CHECK_IDS.indexOf(a.id) - CHECK_IDS.indexOf(b.id));
}

export type SessionState = Pick<AuditSession, "plan" | "progress">;

/** The first URL in a dropped file: a sitemap's first <loc>, a page's canonical or og:url, or any http(s) link. */
export function urlFromFileText(text: string): string | null {
  const head = text.slice(0, 400_000);
  const loc = /<loc>\s*(https?:\/\/[^<\s]+)\s*<\/loc>/i.exec(head)?.[1];
  if (loc) {
    try {
      return new URL(loc).origin;
    } catch {
      /* fall through */
    }
  }
  const canonical =
    /<link[^>]+rel=["']?canonical["']?[^>]*href=["']([^"']+)["']/i.exec(head)?.[1] ??
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']?canonical["']?/i.exec(head)?.[1] ??
    /<meta[^>]+property=["']og:url["'][^>]*content=["']([^"']+)["']/i.exec(head)?.[1];
  if (canonical && /^https?:\/\//i.test(canonical)) return canonical;
  return /https?:\/\/[^\s"'<>)]+/i.exec(head)?.[0] ?? null;
}

/** What a drag carries, reduced to one URL-like string. */
export function urlFromDataTransfer(dt: DataTransfer): string | null {
  const uri = dt.getData("text/uri-list").split(/\r?\n/).find((l) => l && !l.startsWith("#"));
  const text = uri || dt.getData("text/plain");
  const first = text.trim().split(/\s+/)[0] ?? "";
  return first.length >= 3 && first.length <= 2000 ? first : null;
}
