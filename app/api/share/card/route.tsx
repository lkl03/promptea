// app/api/share/card/route.tsx
//
// v1.8.0 — the dynamic Open Graph image of a shared result:
//   /api/share/card?s=72&o=88&b=80.65.40.55.90.70&p=code&t=claude&lang=es
//
// It renders ONLY what lib/share/card.ts decodes — numbers and enum values — so
// it cannot be used to render arbitrary text, and it never sees the prompt.
// Anything invalid falls back to a neutral Promptea card (never an error image,
// so a broken link still unfurls). The response is a pure function of the URL:
// cacheable for a long time.

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BREAKDOWN_ORDER, bandColor, decodeCard, qualityBand, targetLabel } from "@/lib/share/card";
import { purposeLabel } from "@/lib/purposes";
import { isLang } from "@/lib/domain";

export const runtime = "nodejs";

const W = 1200;
const H = 630;

const COPY = {
  es: {
    score: "Puntaje",
    original: "Original",
    optimized: "Optimizado",
    tagline: "Analizá y optimizá tus prompts",
    bands: { weak: "Débil", fair: "Regular", good: "Bueno", excellent: "Excelente" },
    criteria: { clarity: "Claridad", context: "Contexto", constraints: "Restricciones", output: "Formato de salida", verifiability: "Verificabilidad", safety: "Seguridad" },
  },
  en: {
    score: "Score",
    original: "Original",
    optimized: "Optimized",
    tagline: "Analyze and optimize your prompts",
    bands: { weak: "Weak", fair: "Fair", good: "Good", excellent: "Excellent" },
    criteria: { clarity: "Clarity", context: "Context", constraints: "Constraints", output: "Output format", verifiability: "Verifiability", safety: "Safety" },
  },
  pt: {
    score: "Pontuação",
    original: "Original",
    optimized: "Otimizado",
    tagline: "Analise e otimize seus prompts",
    bands: { weak: "Fraco", fair: "Regular", good: "Bom", excellent: "Excelente" },
    criteria: { clarity: "Clareza", context: "Contexto", constraints: "Restrições", output: "Formato de saída", verifiability: "Verificabilidade", safety: "Segurança" },
  },
} as const;

async function pngDataUri(file: string): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), "public", "brand", file));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const langParam = url.searchParams.get("lang");
  const lang = isLang(langParam) ? langParam : "es";
  const c = COPY[lang];
  const data = decodeCard(url.searchParams);
  const [mascot, wordmark] = await Promise.all([pngDataUri("mascot-og.png"), pngDataUri("wordmark-og.png")]);

  const bg = "radial-gradient(circle at 10% 8%, rgba(120,170,255,0.5), rgba(255,255,255,0) 46%), radial-gradient(circle at 92% 92%, rgba(95,224,168,0.5), rgba(255,255,255,0) 50%), linear-gradient(160deg, #eaf1fe 0%, #ece9f8 50%, #e4f5ee 100%)";

  const logo = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {wordmark ? <img src={wordmark} width={230} height={Math.round((230 * 345) / 1591)} alt="" /> : <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>Promptea</div>}
      <div style={{ display: "flex", fontSize: 24, color: "#3f5249" }}>promptea.me</div>
    </div>
  );

  // Fallback: no valid score → the plain brand card.
  if (!data) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: W, height: H, alignItems: "center", justifyContent: "space-between", padding: "0 84px", background: bg }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {wordmark ? <img src={wordmark} width={520} height={Math.round((520 * 345) / 1591)} alt="" /> : null}
            <div style={{ display: "flex", marginTop: 40, fontSize: 52, fontWeight: 700, color: "#0e1f18" }}>{c.tagline}</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {mascot ? <img src={mascot} width={360} height={360} alt="" /> : null}
        </div>
      ),
      { width: W, height: H }
    );
  }

  const main = data.optimizedScore ?? data.score;
  const hasAfter = data.optimizedScore !== null && data.optimizedScore !== data.score;
  const meta = [data.purpose ? purposeLabel(data.purpose, lang) : null, data.target ? targetLabel(data.target) : null].filter(Boolean).join(" · ");

  const res = new ImageResponse(
    (
      <div style={{ display: "flex", width: W, height: H, flexDirection: "column", padding: "44px 64px", background: bg, color: "#0e1f18" }}>
        {logo}

        <div style={{ display: "flex", flex: 1, alignItems: "center", marginTop: 8 }}>
          {/* Score */}
          <div style={{ display: "flex", flexDirection: "column", width: 470 }}>
            <div style={{ display: "flex", fontSize: 26, color: "#3f5249" }}>{c.score}</div>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              {hasAfter ? (
                <>
                  <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: "#6b7a72", lineHeight: 1 }}>{data.score}</div>
                  <div style={{ display: "flex", fontSize: 56, margin: "0 18px", color: "#6b7a72" }}>→</div>
                </>
              ) : null}
              <div style={{ display: "flex", fontSize: hasAfter ? 190 : 230, fontWeight: 700, color: bandColor(main), lineHeight: 1 }}>{main}</div>
              <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: bandColor(main), marginLeft: 6 }}>%</div>
            </div>
            <div style={{ display: "flex", marginTop: 12, fontSize: 34, fontWeight: 700, color: bandColor(main) }}>{c.bands[qualityBand(main)]}</div>
            {hasAfter ? (
              <div style={{ display: "flex", marginTop: 6, fontSize: 24, color: "#3f5249" }}>
                {c.original} {data.score} · {c.optimized} {data.optimizedScore}
              </div>
            ) : null}
            {meta ? <div style={{ display: "flex", marginTop: 14, fontSize: 24, color: "#3f5249" }}>{meta}</div> : null}
          </div>

          {/* Breakdown */}
          <div style={{ display: "flex", flex: 1, flexDirection: "column", marginLeft: 40 }}>
            {data.breakdown ? (
              BREAKDOWN_ORDER.map((k, i) => (
                <div key={k} style={{ display: "flex", flexDirection: "column", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#0e1f18" }}>
                    <div style={{ display: "flex" }}>{c.criteria[k]}</div>
                    <div style={{ display: "flex", fontWeight: 700 }}>{data.breakdown![i]}</div>
                  </div>
                  <div style={{ display: "flex", height: 16, marginTop: 6, borderRadius: 8, background: "rgba(16,64,46,0.12)" }}>
                    <div style={{ display: "flex", width: `${data.breakdown![i]}%`, height: 16, borderRadius: 8, background: bandColor(data.breakdown![i]) }} />
                  </div>
                </div>
              ))
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              mascot ? <img src={mascot} width={300} height={300} alt="" style={{ marginLeft: 120 }} /> : null
            )}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 22, color: "#3f5249" }}>{c.tagline}</div>
      </div>
    ),
    { width: W, height: H }
  );
  res.headers.set("Cache-Control", "public, max-age=86400, s-maxage=31536000, immutable");
  return res;
}
