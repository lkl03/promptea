// app/[lang]/layout.tsx
import "../globals.css";
import { getDictionary, hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";
import localFont from "next/font/local";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";

import Providers from "@/components/Providers";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";
import ToastProvider from "@/components/ToastProvider";
import GlassEnhancer from "@/components/GlassEnhancer";
import NewsletterNudges from "@/components/newsletter/NewsletterNudges";
import JsonLd from "@/components/seo/JsonLd";
import { siteGraph } from "@/lib/seo/jsonld";
import { LOCALES, LOCALE_TAG, OG_LOCALE, getSiteUrl } from "@/lib/seo/site";
import { LANGS, toLang, type Lang } from "@/lib/domain";

/**
 * v1.8.3 — the locales are known at build time. Without this, every page under
 * /[lang] that has no generateStaticParams of its own was rendered on EVERY
 * request (Cache-Control: private, no-store; measured in production: the home
 * took ~1.1 s to first byte against ~0.25 s for a prerendered guide), and its
 * `export const revalidate` did nothing. With the locales enumerated here, pages
 * that read no request data (the home, benchmarks, how it works, about,
 * methodology, privacy, the hubs…) are prerendered and revalidated in the
 * background (ISR); pages that read `searchParams` (AI Daily filters, the
 * analyzer deep link, /share) stay dynamic on their own. An unknown locale
 * still reaches notFound() below.
 */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID; // e.g. "AW-17937226636"

// v1.2.0: fonts are self-hosted (app/fonts, sourced from Fontsource, OFL).
// No build-time Google Fonts fetch -> reproducible offline builds, no CDN
// dependency, no layout shift from late font swaps.
const titleFont = localFont({
  src: [
    { path: "../fonts/space-grotesk-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/space-grotesk-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/space-grotesk-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-title",
  display: "swap",
  // v1.8.3: only the Glass theme uses this family (Aqua and Metro use system
  // fonts). Preloading it made every visit download ~110 KB of fonts it never
  // drew; without the preload the browser fetches it only where it is used.
  preload: false,
});

const bodyFont = localFont({
  src: [
    { path: "../fonts/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/inter-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/inter-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
  preload: false, // Glass only — see titleFont.
});

const monoFont = localFont({
  src: [
    { path: "../fonts/jetbrains-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/jetbrains-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});

const SEO: Record<Lang, { title: string; description: string; keywords: string[] }> = {
  en: {
    title: "Promptea — Prompt analyzer & optimizer for GPT, Claude, Gemini, Grok",
    description:
      "Free prompt analyzer and optimizer for ChatGPT, Claude, Gemini, Grok, DeepSeek, Kimi and Perplexity. Score, fix and rewrite prompts for text, code, data/JSON, marketing, study, image, translation and summaries.",
    keywords: [
      "prompt analyzer",
      "prompt optimizer",
      "prompt engineering",
      "ChatGPT prompts",
      "Claude prompts",
      "Gemini prompts",
      "JSON prompts",
      "coding prompts",
      "AI prompt scoring",
    ],
  },
  es: {
    title: "Promptea — Analizá y optimizá prompts para GPT, Claude, Gemini, Grok",
    description:
      "Analizador y optimizador de prompts gratis para ChatGPT, Claude, Gemini, Grok, DeepSeek, Kimi y Perplexity. Puntúa, mejora y reescribe prompts para texto, código, data/JSON, marketing, estudio, imagen, traducción y resúmenes.",
    keywords: [
      "analizador de prompts",
      "optimizador de prompts",
      "prompts para ChatGPT",
      "prompts para Claude",
      "prompts para Gemini",
      "prompts JSON",
      "prompts de código",
      "prompt engineering",
    ],
  },
  pt: {
    title: "Promptea — Analise e otimize prompts para GPT, Claude, Gemini, Grok",
    description:
      "Analisador e otimizador de prompts gratuito para ChatGPT, Claude, Gemini, Grok, DeepSeek, Kimi e Perplexity. Pontua, corrige e reescreve prompts de texto, código, dados/JSON, marketing, estudo, imagem, tradução e resumos.",
    keywords: [
      "analisador de prompts",
      "otimizador de prompts",
      "engenharia de prompt",
      "prompts para ChatGPT",
      "prompts para Claude",
      "prompts para Gemini",
      "prompts JSON",
      "prompts de código",
      "prompt engineering",
    ],
  },
};

function seoForLang(lang: Lang) {
  return { ...SEO[lang], locale: OG_LOCALE[lang] };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eaf1fe" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
};

// Persisted-theme migration. Must run BEFORE next-themes' own inline script
// reads localStorage, so it lives at the top of <head>. v1.2 light-like themes
// (light/paper) resolve to Aqua, dark-like (dark/night) to Metro; v1.7.0
// retires "classic" ("Old version"), which falls back to "system". Unknown
// values are dropped so next-themes falls back to system. Keep in sync with
// LEGACY_THEME_MAP in lib/themes.ts (test-enforced).
const THEME_MIGRATION_SCRIPT = `(function(){try{var k="theme",v=localStorage.getItem(k);if(!v)return;var m={light:"aqua",paper:"aqua",dark:"metro",night:"metro",classic:"system"};if(m[v]){localStorage.setItem(k,m[v]);}else if(v!=="aqua"&&v!=="metro"&&v!=="glass"&&v!=="system"){localStorage.removeItem(k);}}catch(e){}})();`;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang = toLang(rawLang);

  const siteUrl = getSiteUrl();
  const seo = seoForLang(lang);

  return {
    metadataBase: new URL(siteUrl),
    title: { default: seo.title, template: `%s · Promptea` },
    description: seo.description,
    keywords: seo.keywords,
    // No canonical / hreflang here: every page states its own (lib/seo/metadata.ts).
    // A canonical set at the layout is inherited by any page that does not
    // override `alternates`, which would point it at the home page.
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      siteName: "Promptea",
      title: seo.title,
      description: seo.description,
      locale: seo.locale,
      alternateLocale: LOCALES.filter((l) => l !== lang).map((l) => OG_LOCALE[l]),
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
    // v1.8.0: icons come from the file conventions (app/favicon.ico, app/icon.png,
    // app/apple-icon.png — all derived from the mascot) and app/manifest.ts.
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  if (!hasLocale(rawLang)) notFound();

  const lang = toLang(rawLang);
  const dict = await getDictionary(lang);
  // One connected graph (Organization, studio, logo, WebSite, SoftwareApplication) with stable @ids.
  const jsonLd = siteGraph(lang, seoForLang(lang).description);

  return (
    <html lang={LOCALE_TAG[lang]} suppressHydrationWarning>
      <head>
        {/* Legacy theme migration — before next-themes boots. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_MIGRATION_SCRIPT }} />

        {/* ✅ Google Ads (gtag.js) */}
        {GOOGLE_ADS_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GOOGLE_ADS_ID}');
                `,
              }}
            />
          </>
        )}

        {/* JSON-LD: site-wide entity graph */}
        <JsonLd data={jsonLd} />
      </head>

      <body
        className={[
          titleFont.variable,
          bodyFont.variable,
          monoFont.variable,
          "min-h-dvh",
          "transition-colors duration-200",
        ].join(" ")}
      >
        <Providers>
          <ToastProvider>
            <AnimatedBackground />
            <GlassEnhancer />
            <TopBar lang={lang} dict={dict.nav} />
            {children}
            <Footer lang={lang} appFeedbackDict={dict.appFeedback} labels={{ tech: dict.nav.footerTech, sources: dict.nav.footerSources }} />
            {/* The one controller of newsletter prompts (v1.8.1: first-visit card + pill; AI Daily modal; coordinates the dock) */}
            <NewsletterNudges lang={lang} dict={dict.newsletterNudge} formDict={dict.newsletter.bar} />
          </ToastProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}






