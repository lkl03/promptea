// lib/share/card.ts
//
// v1.8.0 — the shareable result card. Everything the card shows travels in the
// URL as NUMBERS and enum values only:
//
//   /{lang}/share?s=72&o=88&b=80.65.40.55.90.70&p=code&t=claude
//        s  score (0–100)               o  optimized score (optional)
//        b  six breakdown values, dot-separated, in BREAKDOWN_ORDER
//        p  purpose (enum)              t  target AI (enum)
//
// The prompt text is NEVER part of it — not in the URL, not in the image, not in
// the page. Decoding is strict (clamps, enum checks, ignores everything else),
// so the share page and the image endpoint cannot be used to render arbitrary
// text. Pure and tested.

import { PURPOSES, TARGETS } from "@/lib/domain";

export const BREAKDOWN_ORDER = ["clarity", "context", "constraints", "output", "verifiability", "safety"] as const;
export type BreakdownKey = (typeof BREAKDOWN_ORDER)[number];

export type CardData = {
  score: number;
  optimizedScore: number | null;
  breakdown: number[] | null; // 6 values, BREAKDOWN_ORDER
  purpose: (typeof PURPOSES)[number] | null;
  target: (typeof TARGETS)[number] | null;
};

const int = (v: string | null | undefined): number | null => {
  if (v === null || v === undefined || !/^\d{1,3}$/.test(v)) return null;
  const n = Number(v);
  return n >= 0 && n <= 100 ? n : null;
};

type Params = { get(name: string): string | null } | Record<string, string | string[] | undefined>;

function read(params: Params, key: string): string | null {
  if (typeof (params as { get?: unknown }).get === "function") return (params as { get(n: string): string | null }).get(key);
  const v = (params as Record<string, string | string[] | undefined>)[key];
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

/** Strict decode. Returns null when there is no valid score (nothing to show). */
export function decodeCard(params: Params): CardData | null {
  const score = int(read(params, "s"));
  if (score === null) return null;
  const rawB = read(params, "b");
  let breakdown: number[] | null = null;
  if (rawB) {
    const parts = rawB.split(".");
    const vals = parts.map((p) => int(p));
    if (parts.length === BREAKDOWN_ORDER.length && vals.every((v): v is number => v !== null)) breakdown = vals;
  }
  const p = read(params, "p");
  const t = read(params, "t");
  return {
    score,
    optimizedScore: int(read(params, "o")),
    breakdown,
    purpose: (PURPOSES as readonly string[]).includes(p ?? "") ? (p as CardData["purpose"]) : null,
    target: (TARGETS as readonly string[]).includes(t ?? "") ? (t as CardData["target"]) : null,
  };
}

/** Query string for a card (no leading "?"). Values are clamped; text never enters. */
export function encodeCard(input: { score: number; optimizedScore?: number | null; breakdown?: Partial<Record<BreakdownKey, number>> | null; purpose?: string | null; target?: string | null }): string {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const q = new URLSearchParams();
  q.set("s", String(clamp(input.score)));
  if (typeof input.optimizedScore === "number" && Number.isFinite(input.optimizedScore)) q.set("o", String(clamp(input.optimizedScore)));
  const b = input.breakdown;
  if (b && BREAKDOWN_ORDER.every((k) => typeof b[k] === "number" && Number.isFinite(b[k]))) q.set("b", BREAKDOWN_ORDER.map((k) => clamp(b[k]!)).join("."));
  if (input.purpose && (PURPOSES as readonly string[]).includes(input.purpose)) q.set("p", input.purpose);
  if (input.target && (TARGETS as readonly string[]).includes(input.target)) q.set("t", input.target);
  return q.toString();
}

export function qualityBand(score: number): "weak" | "fair" | "good" | "excellent" {
  if (score <= 30) return "weak";
  if (score <= 60) return "fair";
  if (score <= 85) return "good";
  return "excellent";
}

/** Score colours for the card (the Promptea palette, readable on the card's light background). */
export function bandColor(score: number): string {
  if (score < 50) return "#c2362f";
  if (score < 75) return "#b36a00";
  return "#1b7f4c";
}

const TARGET_NAMES: Record<string, string> = { gpt: "GPT", claude: "Claude", gemini: "Gemini", grok: "Grok", kimi: "Kimi", deepseek: "DeepSeek", perplexity: "Perplexity", qwen: "Qwen", glm: "GLM", minimax: "MiniMax", doubao: "Doubao" };
export function targetLabel(t: string): string {
  return TARGET_NAMES[t] ?? t;
}
