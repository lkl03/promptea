// lib/ops/routineHealth.ts
//
// v1.8.8 — "is every routine still publishing?" (pure: no I/O, no clock).
//
// Why: between 2026-10-26 and 2026-11-09 the Monday newsletter routine
// published three editions on the site but never mailed them (its live call
// was blocked by the routine's own permission check), and AI Daily Tech went
// three days without a story. Nobody noticed for weeks. This module turns the
// timestamp of each routine's last output into a verdict that a cron can mail.
//
// The rule, per routine:
//   1. Its schedule lists the slots at which it runs (UTC, from the routine's
//      cron on claude.ai/code/routines).
//   2. Count the slots that came after its last output and are older than a
//      grace period (a run takes 2–6 minutes; the grace absorbs jitter and a
//      slow day).
//   3. More missed slots than the routine is allowed to skip = overdue.
// "Allowed misses" exists because an empty day is a correct outcome for some
// routines (NO_ELIGIBLE_STORY): Tech skipped 3 days in a row on 14–16/11.
//
// The schedules below mirror the routines as of 2026-11-20. If a routine's
// cron changes, change it here too (the test pins them).

/** The five things the owner watches. */
export const ROUTINE_KEYS = ["daily", "morning", "tech", "weekly", "newsletter"] as const;
export type RoutineKey = (typeof ROUTINE_KEYS)[number];

/** A recurring slot: these UTC weekdays (0 = Sunday) at this UTC time. */
export type ScheduleSlot = { weekdays: readonly number[]; hourUtc: number; minuteUtc?: number };

export type RoutineSpec = {
  key: RoutineKey;
  /** What the owner calls it. */
  label: string;
  /** The routine that produces it (claude.ai/code/routines). */
  routineName: string;
  routineId: string;
  /** What "the last output" means for this routine. */
  measures: string;
  schedule: readonly ScheduleSlot[];
  /** Slots it may legitimately produce nothing in (empty days are valid). */
  allowedMisses: number;
  graceMinutes: number;
};

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6] as const;
const WEEKDAYS = [1, 2, 3, 4, 5] as const;

export const ROUTINE_SPECS: Record<RoutineKey, RoutineSpec> = {
  daily: {
    key: "daily",
    label: "AI Daily (noche)",
    routineName: "promptea-ai-daily",
    routineId: "trig_019vhwyMiYGrbcNVVYNbddAx",
    measures: "última nota de la edición daily",
    // cron 0 23 * * *: the daily story runs Monday to Friday (Saturday and
    // Sunday that slot publishes the weekly editions instead).
    schedule: [{ weekdays: WEEKDAYS, hourUtc: 23 }],
    allowedMisses: 2,
    graceMinutes: 180,
  },
  morning: {
    key: "morning",
    label: "AI Daily (mañana)",
    routineName: "promptea-ai-daily-morning",
    routineId: "trig_017wm2bnfBRBsUzsHBU2kvYZ",
    measures: "última nota de la edición daily-morning",
    // cron 0 12 * * 1-5. The morning slot is optional by design, so a whole
    // week without one is the alarm, not a single empty morning.
    schedule: [{ weekdays: WEEKDAYS, hourUtc: 12 }],
    allowedMisses: 4,
    graceMinutes: 180,
  },
  tech: {
    key: "tech",
    label: "AI Daily Tech",
    routineName: "Promptea AI Daily Tech",
    routineId: "trig_016d8RWXCJbYzCYrzKKqfmAc",
    measures: "última nota de la edición tech-daily",
    // cron 0 15 * * *. 14–16/11 had three valid empty days in a row.
    schedule: [{ weekdays: EVERY_DAY, hourUtc: 15 }],
    allowedMisses: 3,
    graceMinutes: 180,
  },
  weekly: {
    key: "weekly",
    label: "AI Daily semanal (resumen y semana que viene)",
    routineName: "promptea-ai-daily",
    routineId: "trig_019vhwyMiYGrbcNVVYNbddAx",
    measures: "última nota weekly-recap o week-ahead",
    // Saturday 23:00 UTC weekly-recap, Sunday 23:00 UTC week-ahead.
    schedule: [{ weekdays: [6, 0], hourUtc: 23 }],
    allowedMisses: 1,
    graceMinutes: 180,
  },
  newsletter: {
    key: "newsletter",
    label: "Promptea Weekly (mail)",
    routineName: "Promptea Weekly newsletter",
    routineId: "trig_01HY66a4RMwbTFHbnf5AwJbk",
    measures: "último envío completo (sentAt de la edición)",
    // cron 0 12 * * 1. Every Monday must end with the edition mailed.
    schedule: [{ weekdays: [1], hourUtc: 12 }],
    allowedMisses: 0,
    graceMinutes: 180,
  },
};

export function routinePageUrl(spec: RoutineSpec): string {
  return `https://claude.ai/code/routines/${spec.routineId}`;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** How far back slots are counted when a routine has no output at all. */
export const LOOKBACK_DAYS = 30;

/** Every slot instant in (from, to], oldest first. */
export function slotsBetween(schedule: readonly ScheduleSlot[], from: Date, to: Date): Date[] {
  const out: Date[] = [];
  if (to.getTime() <= from.getTime()) return out;
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  for (let day = start; day <= to.getTime(); day += DAY) {
    const weekday = new Date(day).getUTCDay();
    for (const slot of schedule) {
      if (!slot.weekdays.includes(weekday)) continue;
      const t = day + slot.hourUtc * 60 * MINUTE + (slot.minuteUtc ?? 0) * MINUTE;
      if (t > from.getTime() && t <= to.getTime()) out.push(new Date(t));
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

export type RoutineStatus = {
  key: RoutineKey;
  label: string;
  routineName: string;
  routineUrl: string;
  measures: string;
  /** ISO instant of the last output, or null if none was found in the scanned window. */
  lastAt: string | null;
  /** Slots that have fully passed (grace included) since the last output. */
  missedRuns: number;
  allowedMisses: number;
  overdue: boolean;
  /** When it became (or will become) overdue: the first slot past the allowance, plus grace. */
  overdueAt: string | null;
  /** Free-form extra facts (e.g. the newsletter's last published edition). */
  detail?: Record<string, string | null>;
};

export function evaluateRoutine(
  spec: RoutineSpec,
  lastAt: Date | null,
  now: Date,
  detail?: Record<string, string | null>
): RoutineStatus {
  const grace = spec.graceMinutes * MINUTE;
  const cutoff = new Date(now.getTime() - grace);
  const from = lastAt ?? new Date(now.getTime() - LOOKBACK_DAYS * DAY);
  const missed = slotsBetween(spec.schedule, from, cutoff);
  // The slot that tips it over, looking forward from the last output.
  const horizon = new Date(from.getTime() + (LOOKBACK_DAYS + 7) * DAY);
  const ahead = slotsBetween(spec.schedule, from, horizon);
  const tipping = ahead[spec.allowedMisses];
  return {
    key: spec.key,
    label: spec.label,
    routineName: spec.routineName,
    routineUrl: routinePageUrl(spec),
    measures: spec.measures,
    lastAt: lastAt ? lastAt.toISOString() : null,
    missedRuns: missed.length,
    allowedMisses: spec.allowedMisses,
    overdue: lastAt === null ? missed.length > 0 : missed.length > spec.allowedMisses,
    overdueAt: lastAt === null ? null : tipping ? new Date(tipping.getTime() + grace).toISOString() : null,
    ...(detail ? { detail } : {}),
  };
}

export type RoutineActivity = Record<RoutineKey, { lastAt: Date | null; detail?: Record<string, string | null> }>;

export type RoutineHealthReport = {
  checkedAt: string;
  ok: boolean;
  overdue: RoutineKey[];
  routines: RoutineStatus[];
};

export function evaluateRoutineHealth(activity: RoutineActivity, now: Date): RoutineHealthReport {
  const routines = ROUTINE_KEYS.map((k) => evaluateRoutine(ROUTINE_SPECS[k], activity[k].lastAt, now, activity[k].detail));
  const overdue = routines.filter((r) => r.overdue).map((r) => r.key);
  return { checkedAt: now.toISOString(), ok: overdue.length === 0, overdue, routines };
}

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/** ROUTINE_ALERT_TO: up to three valid addresses, comma or space separated. */
export function alertRecipients(raw: string | undefined): string[] {
  return [...new Set((raw ?? "").split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter((s) => EMAIL_RE.test(s)))].slice(0, 3);
}

// ---------------------------------------------------------------------------
// The alert email (Spanish: it goes to the owner)
// ---------------------------------------------------------------------------

const fmt = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso))
    : "sin datos en los últimos 30 días";

export function renderAlertEmail(report: RoutineHealthReport): { subject: string; text: string; html: string } {
  const late = report.routines.filter((r) => r.overdue);
  const names = late.map((r) => r.label).join(", ");
  const subject = `Promptea: ${late.length === 1 ? "una rutina está atrasada" : `${late.length} rutinas están atrasadas`} (${names})`;
  const lines = late.map(
    (r) =>
      `- ${r.label}: ${r.measures} ${fmt(r.lastAt)} (hora de Buenos Aires). ` +
      `Pasaron ${r.missedRuns} corridas sin resultado y se permiten ${r.allowedMisses}. ` +
      `Historial: ${r.routineUrl}`
  );
  const ok = report.routines.filter((r) => !r.overdue).map((r) => `- ${r.label}: ${fmt(r.lastAt)}`);
  const text = [
    "Estas rutinas de Promptea pasaron su ventana:",
    "",
    ...lines,
    "",
    "Al día:",
    ...ok,
    "",
    "Qué mirar: el historial de corridas de la rutina (el enlace de arriba). Una corrida que terminó en",
    "NO_ELIGIBLE_STORY es correcta; RESEARCH_FAILED, PUBLICATION_FAILED o un permiso denegado no.",
    "",
    "Este aviso sale una vez por día mientras el atraso siga. Revisado: " + fmt(report.checkedAt) + ".",
  ].join("\n");
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html =
    `<p>Estas rutinas de Promptea pasaron su ventana:</p><ul>` +
    late
      .map(
        (r) =>
          `<li><strong>${esc(r.label)}</strong>: ${esc(r.measures)} ${esc(fmt(r.lastAt))} (hora de Buenos Aires). ` +
          `Pasaron ${r.missedRuns} corridas sin resultado y se permiten ${r.allowedMisses}. ` +
          `<a href="${esc(r.routineUrl)}">Historial de la rutina</a></li>`
      )
      .join("") +
    `</ul><p>Al día:</p><ul>` +
    report.routines
      .filter((r) => !r.overdue)
      .map((r) => `<li>${esc(r.label)}: ${esc(fmt(r.lastAt))}</li>`)
      .join("") +
    `</ul><p>Una corrida que terminó en NO_ELIGIBLE_STORY es correcta; RESEARCH_FAILED, PUBLICATION_FAILED o un permiso denegado no.</p>` +
    `<p style="color:#666">Este aviso sale una vez por día mientras el atraso siga. Revisado: ${esc(fmt(report.checkedAt))}.</p>`;
  return { subject, text, html };
}
