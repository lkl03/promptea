// app/[lang]/opengraph-image.tsx — v1.8.0. Default Open Graph image: the mascot
// and wordmark over the soft mint/blue wash. Pages that need their own image
// (articles, share cards) define theirs; everything else inherits this one.
// Rendered at build time for every locale (generateStaticParams), so it never
// runs on a request and the assets are read from the repo, not the network.

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LANGS, toLang } from "@/lib/domain";

export const alt = "Promptea";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

const COPY = {
  es: { tagline: "Analizá y optimizá tus prompts", sub: "ChatGPT · Claude · Gemini · Grok · DeepSeek" },
  en: { tagline: "Analyze and optimize your prompts", sub: "ChatGPT · Claude · Gemini · Grok · DeepSeek" },
  pt: { tagline: "Analise e otimize seus prompts", sub: "ChatGPT · Claude · Gemini · Grok · DeepSeek" },
} as const;

async function dataUri(file: string): Promise<string> {
  const buf = await readFile(join(process.cwd(), "public", "brand", file));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = toLang(raw);
  const copy = COPY[lang];
  const [mascot, wordmark] = await Promise.all([dataUri("mascot-og.png"), dataUri("wordmark-og.png")]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 84px",
          background:
            "radial-gradient(circle at 12% 8%, rgba(120,170,255,0.55), rgba(255,255,255,0) 46%), radial-gradient(circle at 92% 90%, rgba(95,224,168,0.5), rgba(255,255,255,0) 50%), linear-gradient(160deg, #eaf1fe 0%, #ece9f8 50%, #e4f5ee 100%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={wordmark} width={520} height={Math.round((520 * 345) / 1591)} alt="" />
          <div style={{ marginTop: 40, fontSize: 52, fontWeight: 700, color: "#0e1f18", lineHeight: 1.15 }}>{copy.tagline}</div>
          <div style={{ marginTop: 18, fontSize: 28, color: "#3f5249" }}>{copy.sub}</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mascot} width={400} height={400} alt="" />
      </div>
    ),
    { ...size }
  );
}
