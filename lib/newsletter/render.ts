// lib/newsletter/render.ts
//
// Email rendering for Promptea Weekly (pure — no SDK, no env reads).
//
// Plain HTML with inline styles and presentation tables, no external CSS and
// no hosted images: every email client is a different rendering engine and
// that is the only safe bet. A plain-text alternative is rendered alongside.
//
// v1.6.0: moved out of email.ts so it can be tested without the Resend SDK,
// unsubscribe URLs are built in one place (encoded, absolute), and a quiet
// week with no tools simply omits that section.

import type { Lang } from "@/lib/domain";
import type { NewsletterEdition } from "./types";

export const DEFAULT_SITE_URL = "https://www.promptea.me";

function escHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanSiteUrl(siteUrl: string | undefined): string {
  return String(siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

/** Absolute one-click unsubscribe URL for a subscriber token. */
export function unsubscribeUrlFor(token: string, siteUrl?: string): string {
  return `${cleanSiteUrl(siteUrl)}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** RFC 2369 / RFC 8058 headers: Gmail and Yahoo POST to this URL for one-click unsubscribe. */
export function unsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

type RenderOptions = {
  /** Absolute unsubscribe URL for this recipient (omit only for previews). */
  unsubscribeUrl?: string | null;
  siteUrl?: string;
};

export function renderNewsletterHtml(edition: NewsletterEdition, lang: Lang, opts: RenderOptions = {}): string {
  const content = edition.locales[lang];
  if (!content) return "";
  const site = cleanSiteUrl(opts.siteUrl);
  const es = lang === "es";

  const topStoriesLabel = es ? "Esta semana en IA" : "This week in AI";
  const toolsLabel = es ? "Herramientas y lanzamientos" : "Tools and launches";
  const editorialLabel = es ? "Algo para pensar" : "One thing worth thinking about";
  const weeklyUrl = `${site}/${lang}/weekly`;
  const privacyUrl = `${site}/${lang}/privacy`;
  const unsubUrl = opts.unsubscribeUrl ?? weeklyUrl;
  const readMore = es ? "Leer más →" : "Read more →";

  const storiesHtml = content.topStories
    .map((story) => {
      const articleUrl = `${site}/${lang}/blog/${encodeURIComponent(story.articleSlug)}`;
      return `
    <tr><td style="padding: 16px 0; border-bottom: 1px solid #e5e5e5;">
      <a href="${articleUrl}" style="color: #111; text-decoration: none; font-size: 16px; font-weight: 600; line-height: 22px;">${escHtml(story.headline)}</a>
      <p style="margin: 6px 0 0; font-size: 14px; line-height: 21px; color: #444;">${escHtml(story.summary)}</p>
      <p style="margin: 6px 0 0; font-size: 13px; line-height: 20px; color: #666; font-style: italic;">${escHtml(story.whyItMatters)}</p>
      <a href="${articleUrl}" style="display: inline-block; margin-top: 6px; font-size: 13px; color: #2563eb; text-decoration: none;">${readMore}</a>
    </td></tr>`;
    })
    .join("");

  const toolsHtml = content.tools
    .map(
      (tool) => `
    <tr><td style="padding: 10px 0;">
      <a href="${escHtml(tool.url)}" style="color: #2563eb; text-decoration: none; font-size: 14px; font-weight: 600;">${escHtml(tool.title)}</a>
      <span style="font-size: 13px; color: #666;"> — ${escHtml(tool.description)}</span>
    </td></tr>`
    )
    .join("");

  const toolsBlock = content.tools.length
    ? `
<tr><td style="padding: 24px;">
  <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px;">${escHtml(toolsLabel)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${toolsHtml}
  </table>
</td></tr>`
    : "";

  const editorialBlock =
    content.editorialTitle && content.editorialBody
      ? `<tr><td style="padding: 24px 24px 0;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px;">${escHtml(editorialLabel)}</div>
        <div style="font-size: 16px; font-weight: 600; color: #111; margin-bottom: 6px;">${escHtml(content.editorialTitle)}</div>
        <div style="font-size: 14px; line-height: 22px; color: #444;">${escHtml(content.editorialBody)}</div>
      </td></tr>`
      : "";

  const sponsorBlock = edition.sponsor
    ? `<tr><td style="padding: 24px; border-top: 1px solid #e5e5e5;">
        <div style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px;">Sponsor</div>
        <a href="${escHtml(edition.sponsor.url)}" style="color: #111; text-decoration: none; font-size: 14px; font-weight: 600;">${escHtml(edition.sponsor.name)}</a>
        <p style="margin: 4px 0 0; font-size: 13px; line-height: 20px; color: #666;">${escHtml(edition.sponsor.copy)}</p>
      </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light"><title>${escHtml(content.subject)}</title></head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
<div style="display: none; max-height: 0; overflow: hidden;">${escHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa;">
<tr><td align="center" style="padding: 24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">

<tr><td style="padding: 32px 24px 16px; border-bottom: 1px solid #e5e5e5;">
  <a href="${weeklyUrl}" style="text-decoration: none; color: #111; font-size: 22px; font-weight: 700;">Promptea ${es ? "Semanal" : "Weekly"}</a>
  <div style="margin-top: 4px; font-size: 12px; color: #999;">${escHtml(edition.weekStart)} — ${escHtml(edition.weekEnd)}</div>
</td></tr>

<tr><td style="padding: 24px;">
  <div style="font-size: 24px; font-weight: 700; line-height: 30px; color: #111;">${escHtml(content.heroHeadline)}</div>
  <p style="margin: 8px 0 0; font-size: 15px; line-height: 23px; color: #444;">${escHtml(content.heroDeck)}</p>
</td></tr>

<tr><td style="padding: 0 24px;">
  <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px;">${escHtml(topStoriesLabel)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${storiesHtml}
  </table>
</td></tr>
${toolsBlock}
${editorialBlock}
${sponsorBlock}

<tr><td style="padding: 24px; border-top: 1px solid #e5e5e5; text-align: center;">
  <div style="font-size: 12px; color: #999; line-height: 20px;">
    ${es ? "Recibís este mail porque te suscribiste a Promptea Semanal." : "You receive this email because you subscribed to Promptea Weekly."}<br>
    <a href="${weeklyUrl}" style="color: #999; text-decoration: underline;">Promptea</a>
    &nbsp;·&nbsp;
    <a href="${privacyUrl}" style="color: #999; text-decoration: underline;">${es ? "Privacidad" : "Privacy"}</a>
    &nbsp;·&nbsp;
    <a href="${escHtml(unsubUrl)}" style="color: #999; text-decoration: underline;">${es ? "Desuscribirme" : "Unsubscribe"}</a>
  </div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Plain-text alternative (improves deliverability and accessibility). */
export function renderNewsletterText(edition: NewsletterEdition, lang: Lang, opts: RenderOptions = {}): string {
  const content = edition.locales[lang];
  if (!content) return "";
  const site = cleanSiteUrl(opts.siteUrl);
  const es = lang === "es";
  const lines: string[] = [
    `Promptea ${es ? "Semanal" : "Weekly"} — ${edition.weekStart} – ${edition.weekEnd}`,
    "",
    content.heroHeadline,
    content.heroDeck,
    "",
    es ? "ESTA SEMANA EN IA" : "THIS WEEK IN AI",
  ];
  for (const s of content.topStories) {
    lines.push("", `• ${s.headline}`, `  ${s.summary}`, `  ${s.whyItMatters}`, `  ${site}/${lang}/blog/${encodeURIComponent(s.articleSlug)}`);
  }
  if (content.tools.length) {
    lines.push("", es ? "HERRAMIENTAS Y LANZAMIENTOS" : "TOOLS AND LAUNCHES");
    for (const t of content.tools) lines.push(`• ${t.title} — ${t.description}`, `  ${t.url}`);
  }
  lines.push("", "—", `${es ? "Desuscribirme" : "Unsubscribe"}: ${opts.unsubscribeUrl ?? `${site}/${lang}/weekly`}`);
  return lines.join("\n");
}
