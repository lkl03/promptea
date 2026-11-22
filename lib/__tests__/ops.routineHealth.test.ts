// v1.8.8 — routine health: schedules, verdicts, the alert email and the
// test-address rule for the newsletter.

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  ROUTINE_KEYS,
  ROUTINE_SPECS,
  alertRecipients,
  evaluateRoutine,
  evaluateRoutineHealth,
  renderAlertEmail,
  slotsBetween,
  type RoutineActivity,
} from "@/lib/ops/routineHealth";
import { exclusionReason, isExcludedRecipient, parseExcludedRecipients } from "@/lib/newsletter/recipients";
import { hasBearer, usableSecrets } from "@/lib/ops/auth";

const at = (iso: string) => new Date(iso);

describe("schedules mirror the routines (claude.ai/code/routines, 2026-11-20)", () => {
  test("covers exactly the five editions the owner watches", () => {
    expect([...ROUTINE_KEYS]).toEqual(["daily", "morning", "tech", "weekly", "newsletter"]);
  });
  test("crons", () => {
    expect(ROUTINE_SPECS.daily.schedule).toEqual([{ weekdays: [1, 2, 3, 4, 5], hourUtc: 23 }]);
    expect(ROUTINE_SPECS.morning.schedule).toEqual([{ weekdays: [1, 2, 3, 4, 5], hourUtc: 12 }]);
    expect(ROUTINE_SPECS.tech.schedule).toEqual([{ weekdays: [0, 1, 2, 3, 4, 5, 6], hourUtc: 15 }]);
    expect(ROUTINE_SPECS.weekly.schedule).toEqual([{ weekdays: [6, 0], hourUtc: 23 }]);
    expect(ROUTINE_SPECS.newsletter.schedule).toEqual([{ weekdays: [1], hourUtc: 12 }]);
  });
  test("every spec links to its routine page", () => {
    for (const k of ROUTINE_KEYS) expect(ROUTINE_SPECS[k].routineId).toMatch(/^trig_[A-Za-z0-9]+$/);
  });
});

describe("slotsBetween", () => {
  test("Mon-Fri 23:00 UTC across a weekend", () => {
    // Fri 2026-11-13 23:30 → Tue 2026-11-17 23:30: Mon 16 and Tue 17 only.
    const s = slotsBetween(ROUTINE_SPECS.daily.schedule, at("2026-11-13T23:30:00Z"), at("2026-11-17T23:30:00Z"));
    expect(s.map((d) => d.toISOString())).toEqual(["2026-11-16T23:00:00.000Z", "2026-11-17T23:00:00.000Z"]);
  });
  test("exclusive start, inclusive end, empty for a reversed range", () => {
    const sched = ROUTINE_SPECS.tech.schedule;
    expect(slotsBetween(sched, at("2026-11-19T15:00:00Z"), at("2026-11-20T15:00:00Z"))).toHaveLength(1);
    expect(slotsBetween(sched, at("2026-11-20T00:00:00Z"), at("2026-11-19T00:00:00Z"))).toHaveLength(0);
  });
});

describe("verdicts on the real incidents", () => {
  test("Tech, 14–16/11: three valid empty days are not an alarm, the fourth is", () => {
    const last = at("2026-11-14T02:31:11Z"); // the 13/11 story (published 23:31 ART)
    const onDay3 = evaluateRoutine(ROUTINE_SPECS.tech, last, at("2026-11-16T19:00:00Z"));
    expect(onDay3).toMatchObject({ missedRuns: 3, overdue: false });
    const onDay4 = evaluateRoutine(ROUTINE_SPECS.tech, last, at("2026-11-17T19:00:00Z"));
    expect(onDay4).toMatchObject({ missedRuns: 4, overdue: true, overdueAt: "2026-11-17T18:00:00.000Z" });
  });

  test("Newsletter, 26/10: published but not mailed is overdue the same Monday", () => {
    // Last full send before the blocked Mondays: 2026-10-19 (Resend history before 23/10 not checked).
    const lastSent = at("2026-10-19T12:23:00Z");
    const mondayAfternoon = evaluateRoutine(ROUTINE_SPECS.newsletter, lastSent, at("2026-10-26T16:00:00Z"));
    expect(mondayAfternoon).toMatchObject({ missedRuns: 1, overdue: true });
    // …and still before the grace period it is not.
    expect(evaluateRoutine(ROUTINE_SPECS.newsletter, lastSent, at("2026-10-26T13:00:00Z")).overdue).toBe(false);
  });

  test("a routine with no output in 30 days is overdue; one that never had a slot is not", () => {
    expect(evaluateRoutine(ROUTINE_SPECS.daily, null, at("2026-11-20T16:00:00Z"))).toMatchObject({ overdue: true, lastAt: null });
  });

  test("the morning slot is optional: four empty weekday mornings are fine", () => {
    const last = at("2026-11-13T12:18:00Z"); // Friday
    expect(evaluateRoutine(ROUTINE_SPECS.morning, last, at("2026-11-19T16:00:00Z"))).toMatchObject({ missedRuns: 4, overdue: false });
    expect(evaluateRoutine(ROUTINE_SPECS.morning, last, at("2026-11-20T16:00:00Z"))).toMatchObject({ missedRuns: 5, overdue: true });
  });
});

describe("report and email", () => {
  const now = at("2026-11-20T16:00:00Z");
  const healthy: RoutineActivity = {
    daily: { lastAt: at("2026-11-19T23:06:00Z") },
    morning: { lastAt: at("2026-11-19T12:16:00Z") },
    tech: { lastAt: at("2026-11-19T15:14:51Z") },
    weekly: { lastAt: at("2026-11-15T23:06:50Z") },
    newsletter: { lastAt: at("2026-11-16T12:03:49Z"), detail: { lastSentEdition: "promptea-weekly_2026-11-16", lastPublishedEdition: null, lastPublishedAt: null } },
  };

  test("all on time", () => {
    const r = evaluateRoutineHealth(healthy, now);
    expect(r).toMatchObject({ ok: true, overdue: [] });
    expect(r.routines).toHaveLength(5);
  });

  test("an overdue routine is named in the subject with its routine link, in Spanish, without secrets", () => {
    const r = evaluateRoutineHealth({ ...healthy, tech: { lastAt: at("2026-11-14T02:31:11Z") } }, now);
    expect(r.overdue).toEqual(["tech"]);
    const mail = renderAlertEmail(r);
    expect(mail.subject).toBe("Promptea: una rutina está atrasada (AI Daily Tech)");
    expect(mail.text).toContain("https://claude.ai/code/routines/trig_016d8RWXCJbYzCYrzKKqfmAc");
    expect(mail.text).toContain("se permiten 3");
    expect(mail.html).toContain("<strong>AI Daily Tech</strong>");
    expect(mail.text + mail.html).not.toMatch(/SECRET|secret/);
  });

  test("ROUTINE_ALERT_TO parsing", () => {
    expect(alertRecipients(" Owner@Example.com , owner@example.com;bad ")).toEqual(["owner@example.com"]);
    expect(alertRecipients(undefined)).toEqual([]);
    expect(alertRecipients("a@x.io b@x.io c@x.io d@x.io")).toHaveLength(3);
  });
});

describe("bearer auth for the ops routes", () => {
  test("fails closed and compares exactly", () => {
    expect(usableSecrets(undefined, "short", "x".repeat(16))).toEqual(["x".repeat(16)]);
    const s = usableSecrets("s3cret-value-1234567");
    expect(hasBearer("Bearer s3cret-value-1234567", s)).toBe(true);
    expect(hasBearer("Bearer s3cret-value-123456", s)).toBe(false);
    expect(hasBearer("s3cret-value-1234567", s)).toBe(false);
    expect(hasBearer(null, s)).toBe(false);
    expect(hasBearer("Bearer anything-long-enough", [])).toBe(false);
  });
});

describe("newsletter test addresses (the three that bounced on 2026-11-16)", () => {
  test("reserved TLDs and the QA mailbox are excluded", () => {
    expect(exclusionReason("probe@test.test")).toBe("reserved_tld");
    expect(exclusionReason("version-check@test.test")).toBe("reserved_tld");
    expect(exclusionReason("Test-QA-v150@Promptea.me")).toBe("qa_mailbox");
    expect(exclusionReason("someone@localhost")).toBe("reserved_tld");
  });
  test("v1.8.9: the RFC 2606 example domains are excluded (the /zh placeholder is name@example.com)", () => {
    expect(exclusionReason("name@example.com")).toBe("reserved_domain");
    expect(exclusionReason("Reader@Example.NET")).toBe("reserved_domain");
    expect(exclusionReason("x@mail.example.org")).toBe("reserved_domain");
    expect(exclusionReason("x@myexample.com")).toBeNull();
  });
  test("real-looking addresses are not", () => {
    for (const e of ["ana@gmail.com", "weekly@promptea.me", "contest@test.com", "qa@company.test.io", "team@example-agency.com"]) {
      expect(isExcludedRecipient(e)).toBe(false);
    }
  });
  test("NEWSLETTER_EXCLUDED_RECIPIENTS adds addresses and @domains", () => {
    const cfg = parseExcludedRecipients("old@foo.com, @staging.acme.dev ; nope");
    expect(cfg).toEqual(["old@foo.com", "@staging.acme.dev"]);
    expect(exclusionReason("old@foo.com", cfg)).toBe("configured");
    expect(exclusionReason("x@staging.acme.dev", cfg)).toBe("configured");
    expect(exclusionReason("x@foo.com", cfg)).toBeNull();
  });
  test("the cleanup script applies the same rule", () => {
    const src = readFileSync(path.resolve(__dirname, "../../scripts/newsletter/exclude-test-subscribers.mjs"), "utf8");
    const lib = readFileSync(path.resolve(__dirname, "../newsletter/recipients.ts"), "utf8");
    expect(src).toContain('const RESERVED_TLDS = ["test", "example", "invalid", "localhost"];');
    expect(lib).toContain('export const RESERVED_TLDS = ["test", "example", "invalid", "localhost"] as const;');
    const re = (s: string) => /QA_MAILBOX_RE = (\/.+\/);/.exec(s)?.[1];
    expect(re(src)).toBe(re(lib));
    expect(src).not.toMatch(/\.delete\(/);
  });
});

describe("cron", () => {
  test("vercel.json runs the alert once a day at 16:00 UTC (13:00 ART)", () => {
    const cfg = JSON.parse(readFileSync(path.resolve(__dirname, "../../vercel.json"), "utf8"));
    expect(cfg.crons).toEqual([{ path: "/api/internal/routines/alert", schedule: "0 16 * * *" }]);
  });
});
