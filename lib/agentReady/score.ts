// lib/agentReady/score.ts
//
// v1.9.0 — from check results to a 0–100 score, per-category scores and a level.

import { CATEGORIES, type CategoryScore, type CheckResult, type Level } from "./types";

export function categoryScores(checks: readonly CheckResult[]): CategoryScore[] {
  return CATEGORIES.map((category) => {
    const own = checks.filter((c) => c.category === category);
    const max = own.reduce((s, c) => s + c.weight, 0);
    const points = own.reduce((s, c) => s + c.points, 0);
    return { category, points, max, score: max === 0 ? 0 : Math.round((points / max) * 100) };
  });
}

export function totalScore(checks: readonly CheckResult[]): number {
  const max = checks.reduce((s, c) => s + c.weight, 0);
  return max === 0 ? 0 : Math.round((checks.reduce((s, c) => s + c.points, 0) / max) * 100);
}

/** invisible < 40 ≤ readable < 60 ≤ friendly < 80 ≤ ready */
export function levelOf(score: number): Level {
  if (score >= 80) return "ready";
  if (score >= 60) return "friendly";
  if (score >= 40) return "readable";
  return "invisible";
}
