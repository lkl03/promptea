// lib/newsletter/email.ts
//
// v1.5.0 — email rendering and delivery for Promptea Weekly.
//
// Delivery is gated behind NEWSLETTER_DELIVERY_ENABLED. When disabled (the
// default), the generation and preview work but no email is sent. This file
// uses Resend's SDK directly — the `resend` package has been a dependency
// since v1.3.0 but was never used.
//
// The email is plain HTML with inline styles, no external CSS, no images
// that require hosting. Every email client is a different rendering engine
// and the only safe bet is tables + inline styles.

import "server-only";

import { Resend } from "resend";
import type { Lang } from "@/lib/domain";
import type { NewsletterEdition } from "@/lib/newsletter/types";

const DELIVERY_ENABLED = process.env.NEWSLETTER_DELIVERY_ENABLED === "true";
const FROM_ADDRESS = process.env.NEWSLETTER_FROM_ADDRESS ?? "Promptea Weekly <weekly@promptea.me>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.promptea.me";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function storyHtml(story: { headline: string; summary: string; whyItMatters: string; sourceUrl: string; articleSlug: string }, lang: Lang): string {
  const articleUrl = `${SITE_URL}/${lang}/blog/${story.articleSlug}`;
  const readMore = lang === "es" ? "Leer más →" : "Read more →";
  return `
    <tr><td style="padding: 16px 0; border-bottom: 1px solid #e5e5e5;">
      <a href="${articleUrl}" style="color: #111; text-decoration: none; font-size: 16px; font-weight: 600; line-height: 22px;">${escHtml(story.headline)}</a>
      <p style="margin: 6px 0 0; font-size: 14px; line-height: 21px; color: #444;">${escHtml(story.summary)}</p>
      <p style="margin: 6px 0 0; font-size: 13px; line-height: 20px; color: #666; font-style: italic;">${escHtml(story.whyItMatters)}</p>
      <a href="${articleUrl}" style="display: inline-block; margin-top: 6px; font-size: 13px; color: #2563eb; text-decoration: none;">${readMore}</a>
    </td></tr>`;
}

function toolHtml(tool: { title: string; description: string; url: string }): string {
  return `
    <tr><td style="padding: 10px 0;">
      <a href="${escHtml(tool.url)}" style="color: #2563eb; text-decoration: none; font-size: 14px; font-weight: 600;">${escHtml(tool.title)}</a>
      <span style="font-size: 13px; color: #666;"> — ${escHtml(tool.description)}</span>
    </td></tr>`;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderNewsletterHtml(edition: NewsletterEdition, lang: Lang, unsubscribeToken?: string): string {
  const content = edition.locales[lang];
  if (!content) return "";

  const topStoriesLabel = lang === "es" ? "Esta semana en IA" : "This week in AI";
  const toolsLabel = lang === "es" ? "Herramientas y lanzamientos" : "Tools and launches";
  const editorialLabel = lang === "es" ? "Algo para pensar" : "One thing worth thinking about";
  const sponsorLabel = lang === "es" ? "Sponsor" : "Sponsor";
  const weeklyUrl = `${SITE_URL}/${lang}/weekly`;
  const unsubUrl = unsubscribeToken ? `${SITE_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}` : "#";
  const privacyUrl = `${SITE_URL}/${lang}/privacy`;

  const storiesHtml = content.topStories.map((s) => storyHtml(s, lang)).join("");
  const toolsHtml = content.tools.map(toolHtml).join("");

  const editorialBlock = content.editorialTitle && content.editorialBody
    ? `<tr><td style="padding: 24px 0 0;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px;">${escHtml(editorialLabel)}</div>
        <div style="font-size: 16px; font-weight: 600; color: #111; margin-bottom: 6px;">${escHtml(content.editorialTitle)}</div>
        <div style="font-size: 14px; line-height: 22px; color: #444;">${escHtml(content.editorialBody)}</div>
      </td></tr>`
    : "";

  const sponsorBlock = edition.sponsor
    ? `<tr><td style="padding: 24px 0; border-top: 1px solid #e5e5e5;">
        <div style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px;">${escHtml(sponsorLabel)}</div>
        <a href="${escHtml(edition.sponsor.url)}" style="color: #111; text-decoration: none; font-size: 14px; font-weight: 600;">${escHtml(edition.sponsor.name)}</a>
        <p style="margin: 4px 0 0; font-size: 13px; line-height: 20px; color: #666;">${escHtml(edition.sponsor.copy)}</p>
      </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"><title>${escHtml(content.subject)}</title></head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa;">
<tr><td align="center" style="padding: 24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

<!-- Header -->
<tr><td style="padding: 32px 24px 16px; border-bottom: 1px solid #e5e5e5;">
  <a href="${weeklyUrl}" style="text-decoration: none; color: #111; font-size: 22px; font-weight: 700;">Promptea ${lang === "es" ? "Semanal" : "Weekly"}</a>
  <div style="margin-top: 4px; font-size: 12px; color: #999;">${edition.weekStart} — ${edition.weekEnd}</div>
</td></tr>

<!-- Hero -->
<tr><td style="padding: 24px;">
  <div style="font-size: 24px; font-weight: 700; line-height: 30px; color: #111;">${escHtml(content.heroHeadline)}</div>
  <p style="margin: 8px 0 0; font-size: 15px; line-height: 23px; color: #444;">${escHtml(content.heroDeck)}</p>
</td></tr>

<!-- Top Stories -->
<tr><td style="padding: 0 24px;">
  <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px;">${escHtml(topStoriesLabel)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${storiesHtml}
  </table>
</td></tr>

<!-- Tools -->
${content.tools.length > 0 ? `
<tr><td style="padding: 24px;">
  <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px;">${escHtml(toolsLabel)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${toolsHtml}
  </table>
</td></tr>` : ""}

<!-- Editorial -->
${editorialBlock ? `<tr><td style="padding: 0 24px;">${editorialBlock}</td></tr>` : ""}

<!-- Sponsor -->
${sponsorBlock ? `<tr><td style="padding: 0 24px;">${sponsorBlock}</td></tr>` : ""}

<!-- Footer -->
<tr><td style="padding: 24px; border-top: 1px solid #e5e5e5; text-align: center;">
  <div style="font-size: 12px; color: #999; line-height: 20px;">
    <a href="${weeklyUrl}" style="color: #999; text-decoration: underline;">Promptea</a>
    &nbsp;·&nbsp;
    <a href="${privacyUrl}" style="color: #999; text-decoration: underline;">${lang === "es" ? "Privacidad" : "Privacy"}</a>
    &nbsp;·&nbsp;
    <a href="${unsubUrl}" style="color: #999; text-decoration: underline;">${lang === "es" ? "Desuscribirme" : "Unsubscribe"}</a>
  </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export type SendResult =
  | { ok: true; sent: number }
  | { ok: false; reason: "delivery_disabled" | "no_api_key" | "no_subscribers" | "send_error"; error?: string };

export async function sendNewsletter(
  edition: NewsletterEdition,
  subscribers: Array<{ email: string; lang: Lang; unsubscribeToken: string }>
): Promise<SendResult> {
  if (!DELIVERY_ENABLED) return { ok: false, reason: "delivery_disabled" };

  const resend = getResend();
  if (!resend) return { ok: false, reason: "no_api_key" };
  if (subscribers.length === 0) return { ok: false, reason: "no_subscribers" };

  let sent = 0;

  for (const sub of subscribers) {
    const content = edition.locales[sub.lang];
    if (!content) continue;

    const html = renderNewsletterHtml(edition, sub.lang, sub.unsubscribeToken);

    try {
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: [sub.email],
        subject: content.subject,
        html,
        headers: {
          "List-Unsubscribe": `<${SITE_URL}/api/newsletter/unsubscribe?token=${sub.unsubscribeToken}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      sent++;
    } catch {
      // Individual send failures should not abort the batch
    }
  }

  return { ok: true, sent };
}
