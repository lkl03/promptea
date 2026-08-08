// app/[lang]/blog/[slug]/opengraph-image.tsx
//
// v1.4.0 — every AI Daily article gets an ORIGINAL, generated cover.
//
// Why generate instead of store: an editorial routine that picks images off the
// web is a copyright incident waiting to happen, and hosting real artwork would
// mean wiring Firebase Storage for something readers only ever see as a 1200x630
// thumbnail in a share card. Drawing the cover from the article's own text costs
// nothing, is unambiguously ours, and can never be wrong about rights.
//
// Robustness: this route must produce a PNG no matter what. If Firestore is
// unreachable (no credentials in a local build) or the slug does not resolve, it
// falls back to a generic branded cover rather than throwing — a share card that
// renders the site's identity beats a broken image.
//
// Satori (the renderer behind ImageResponse) supports a limited CSS subset:
// every element with more than one child needs an explicit display:"flex", and
// no font file is loaded here on purpose — the bundled default face keeps this
// free of filesystem access at build time.

import { ImageResponse } from "next/og";
import { isLang } from "@/lib/domain";
import type { Lang } from "@/lib/domain";
import { formatEditorialDate } from "@/lib/blog/dates";
import { getArticleBySlug } from "@/lib/blog/server";

export const runtime = "nodejs";
export const revalidate = 300;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Promptea · AI Daily";

const BG = "#08080c";
const INK = "#f5f5f7";
const ACCENT = "#7c8cff";

const FALLBACK: Record<Lang, { title: string; footer: string }> = {
  es: {
    title: "La noticia de IA del día, verificada.",
    footer: "promptea.me",
  },
  en: {
    title: "The AI story of the day, verified.",
    footer: "promptea.me",
  },
};

/** Cut a headline so it still fits three comfortable lines at the largest size. */
function clampTitle(s: string, max = 118): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Longer headlines step down in size so the block always fills the same box. */
function titleSize(len: number): number {
  if (len > 96) return 54;
  if (len > 68) return 62;
  if (len > 44) return 72;
  return 82;
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const l: Lang = isLang(lang) ? lang : "es";

  // Never let a data problem become a rendering problem.
  let title = FALLBACK[l].title;
  let dateLabel = "";
  let meta = "";

  if (isLang(lang)) {
    try {
      const article = await getArticleBySlug(l, slug);
      if (article) {
        title = clampTitle(article.title);
        dateLabel = formatEditorialDate(article.eventDate, l);
        meta = `${article.readingMinutes} min`;
      }
    } catch {
      // Firestore unavailable — the generic cover below is the answer.
    }
  }

  const fontSize = titleSize(title.length);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: BG,
          backgroundImage: `linear-gradient(135deg, ${BG} 0%, #171733 62%, ${BG} 100%)`,
          color: INK,
          fontFamily: "sans-serif",
        }}
      >
        {/* Eyebrow */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 14,
              backgroundColor: ACCENT,
              marginRight: 18,
            }}
          />
          <div
            style={{
              fontSize: 24,
              letterSpacing: 7,
              textTransform: "uppercase",
              opacity: 0.75,
            }}
          >
            Promptea · AI Daily
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              width: 96,
              height: 6,
              borderRadius: 6,
              backgroundColor: ACCENT,
              marginBottom: 32,
            }}
          />
          <div
            style={{
              fontSize,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 26,
            opacity: 0.7,
          }}
        >
          <div style={{ display: "flex" }}>{dateLabel || FALLBACK[l].footer}</div>
          <div style={{ display: "flex" }}>{meta}</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
