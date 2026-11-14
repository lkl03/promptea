// lib/telemetry/bots.ts
//
// v1.8.6 "medición limpia" — server-side filter for the telemetry routes.
//
// A request whose User-Agent names a crawler, an automation tool or a plain
// HTTP library is acknowledged (200 {skipped: "bot"}, so the bot learns
// nothing) and NOT written. A request without a User-Agent is treated as a
// bot: every browser sends one.
//
// This only catches bots that say what they are. Headless fleets that spoof a
// normal Chrome UA are handled on the client (lib/telemetry/humanGate.ts: no
// telemetry without a real interaction, none at all under WebDriver).

import { AI_CRAWLERS } from "@/lib/seo/crawlers";

// Generic markers. `[a-z]bot[/;]` matches "Googlebot/2.1", "AhrefsBot/7.0",
// "compatible;PetalBot;" but not a phone model like "CUBOT X30" (Android
// UAs carry the device model); the bare
// word "bot" is matched only when it stands alone.
const GENERIC_BOT =
  /(?<![a-z])bot(?![a-z])|[a-z]bot[/;]|crawl|spider|slurp|scrapy|headless|phantomjs|puppeteer|playwright|selenium|webdriver|lighthouse|pagespeed|gtmetrix|facebookexternalhit|meta-external|meta-webindexer|python-|python\/|aiohttp|httpx|curl\/|wget\/|go-http-client|axios\/|node-fetch|undici|okhttp|java\/|apache-httpclient|libwww|httpclient|feedfetcher|preview|monitor|uptime/i;

// The AI crawler tokens from the robots policy, lower-cased: also catches the
// ones without "bot" in their name (ChatGPT-User, Perplexity-User…).
const AI_TOKENS = AI_CRAWLERS.map((c) => c.userAgent.toLowerCase());

/** True when the User-Agent belongs to a known bot, tool, or is missing. */
export function isBotUserAgent(ua: string | null | undefined): boolean {
  const s = (ua ?? "").trim();
  if (s.length === 0) return true;
  if (GENERIC_BOT.test(s)) return true;
  const lower = s.toLowerCase();
  return AI_TOKENS.some((t) => lower.includes(t));
}

/** The response every telemetry route gives a bot: success, nothing stored. */
export const BOT_SKIPPED = { ok: true, skipped: "bot" } as const;
