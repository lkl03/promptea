// lib/telemetry/humanGate.ts
//
// v1.8.6 "medición limpia" — own telemetry is sent only after a real
// interaction.
//
// The 2026-11-14 traffic review found automated browsers that execute JS
// (Linux-desktop headless fleets, a Tencent Cloud crawler calling
// /api/telemetry/app ~171 times a week): they render the analyzer, fire the
// on-mount events (mode_opened, the session ping, newsletter impressions) and
// leave. They never press a key or a pointer.
//
// So every telemetry send goes through `afterHumanInteraction(fn)`:
//   - navigator.webdriver === true (Puppeteer, Playwright, Selenium, our own
//     release scripts) → dropped, never sent;
//   - before the first trusted pointerdown / keydown / touchstart / wheel →
//     queued (at most MAX_QUEUE), flushed on that first interaction;
//   - after it → sent immediately.
// A visit that never interacts sends nothing of our own (Vercel Analytics
// still counts its page view). `isTrusted` is false for events dispatched by
// page scripts, so a bot cannot unlock the gate with dispatchEvent().

const INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart", "wheel"] as const;
const MAX_QUEUE = 20;

let interacted = false;
let listening = false;
let queue: Array<() => void> = [];

/** True in browsers driven by automation (WebDriver / CDP-controlled). */
export function isAutomatedBrowser(): boolean {
  try {
    return typeof navigator !== "undefined" && (navigator as { webdriver?: boolean }).webdriver === true;
  } catch {
    return false;
  }
}

function flush() {
  const pending = queue;
  queue = [];
  for (const fn of pending) {
    try {
      fn();
    } catch {
      // telemetry never breaks the page
    }
  }
}

function onInteraction(e: Event) {
  if (!e.isTrusted) return;
  interacted = true;
  stopListening();
  flush();
}

function stopListening() {
  if (!listening || typeof window === "undefined") return;
  for (const type of INTERACTION_EVENTS) window.removeEventListener(type, onInteraction, true);
  listening = false;
}

function startListening() {
  if (listening || typeof window === "undefined") return;
  for (const type of INTERACTION_EVENTS) window.addEventListener(type, onInteraction, { capture: true, passive: true });
  listening = true;
}

/** Whether a trusted interaction has happened on this page. */
export function hasHumanInteracted(): boolean {
  return interacted;
}

/**
 * Runs `fn` now if the visitor has already interacted, later (on the first
 * interaction) if not, and never in an automated browser or on the server.
 */
export function afterHumanInteraction(fn: () => void): void {
  if (typeof window === "undefined") return;
  if (isAutomatedBrowser()) return;
  if (interacted) {
    try {
      fn();
    } catch {
      // ignore
    }
    return;
  }
  if (queue.length < MAX_QUEUE) queue.push(fn);
  startListening();
}

/** Test hook. */
export function __resetHumanGateForTests() {
  stopListening();
  interacted = false;
  listening = false;
  queue = [];
}
