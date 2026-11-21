// app/api/internal/routines/alert/route.ts
//
// v1.8.8 — daily routine alert (Vercel Cron, see vercel.json).
//
//   GET /api/internal/routines/alert            (Authorization: Bearer <CRON_SECRET>)
//   GET /api/internal/routines/alert?dryRun=1   (same check, never sends)
//
// Evaluates the same report as /api/internal/routines/health. When at least
// one routine is overdue it mails ROUTINE_ALERT_TO once per editorial day
// (a Firestore document per day makes a double cron fire harmless). Nothing
// is sent when everything is on time, when ROUTINE_ALERT_TO is not set, or
// in dryRun.

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { APP_VERSION } from "@/lib/version";
import { editorialDate } from "@/lib/blog/dates";
import { hasBearer, usableSecrets } from "@/lib/ops/auth";
import { alertRecipients, evaluateRoutineHealth, renderAlertEmail } from "@/lib/ops/routineHealth";
import { claimAlertDay, readRoutineActivity } from "@/lib/ops/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_FROM = "Promptea Ops <ops@promptea.me>";

function json(body: Record<string, unknown>, status: number) {
  const res = NextResponse.json(body, { status });
  res.headers.set("x-app-version", APP_VERSION);
  res.headers.set("cache-control", "no-store");
  res.headers.set("x-robots-tag", "noindex");
  return res;
}

export async function GET(req: NextRequest) {
  // Only the cron secret: this route can send mail.
  const secrets = usableSecrets(process.env.CRON_SECRET);
  if (secrets.length === 0) return json({ ok: false, error: "alert_disabled" }, 503);
  if (!hasBearer(req.headers.get("authorization"), secrets)) return json({ ok: false, error: "unauthorized" }, 401);

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  let report;
  try {
    report = evaluateRoutineHealth(await readRoutineActivity(), new Date());
  } catch {
    return json({ ok: false, error: "storage_unavailable" }, 503);
  }

  const base = { ok: true, overdue: report.overdue, checkedAt: report.checkedAt };
  if (report.overdue.length === 0) return json({ ...base, emailed: false, reason: "all_on_time" }, 200);
  if (dryRun) return json({ ...base, emailed: false, reason: "dry_run", preview: renderAlertEmail(report).subject }, 200);

  const to = alertRecipients(process.env.ROUTINE_ALERT_TO);
  const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
  if (to.length === 0) return json({ ...base, emailed: false, reason: "ROUTINE_ALERT_TO_not_set" }, 200);
  if (apiKey.length < 8) return json({ ...base, emailed: false, reason: "RESEND_API_KEY_not_set" }, 200);

  const day = editorialDate();
  let first: boolean;
  try {
    first = await claimAlertDay(day, report.overdue);
  } catch {
    return json({ ok: false, error: "storage_unavailable" }, 503);
  }
  if (!first) return json({ ...base, emailed: false, reason: "already_alerted_today" }, 200);

  const mail = renderAlertEmail(report);
  try {
    const { error } = await new Resend(apiKey).emails.send(
      {
        from: (process.env.ROUTINE_ALERT_FROM ?? "").trim() || DEFAULT_FROM,
        to,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        tags: [{ name: "kind", value: "routine-health" }],
      },
      { idempotencyKey: `routine-health/${day}` }
    );
    if (error) return json({ ...base, emailed: false, reason: "send_failed", error: error.name ?? "send_error" }, 502);
  } catch {
    return json({ ...base, emailed: false, reason: "send_failed", error: "network_error" }, 502);
  }
  return json({ ...base, emailed: true, recipients: to.length }, 200);
}
