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
});

const bodyFont = localFont({
  src: [
    { path: "../fonts/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/inter-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/inter-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
});

const monoFont = localFont({
  src: [
    { path: "../fonts/jetbrains-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/jetbrains-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});

function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.trim().length > 0) return env.startsWith("http") ? env : `https://${env}`;
  const vercel = process.env.VERCEL_URL;
  if (vercel && vercel.trim().length > 0) return `https://${vercel}`;
  return "http://localhost:3000";
}

function seoForLang(lang: "es" | "en") {
  if (lang === "en") {
    return {
      title: "Promptea — Prompt analyzer & optimizer for GPT, Claude, Gemini, Grok",
      description:
        "Free prompt analyzer and optimizer for ChatGPT, Claude, Gemini, Grok, DeepSeek, Kimi and Perplexity. Score, fix and rewrite prompts for text, code, data/JSON, marketing, study, image, translation and summaries.",
      locale: "en_US",
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
    };
  }
  return {
    title: "Promptea — Analizá y optimizá prompts para GPT, Claude, Gemini, Grok",
    description:
      "Analizador y optimizador de prompts gratis para ChatGPT, Claude, Gemini, Grok, DeepSeek, Kimi y Perplexity. Puntúa, mejora y reescribe prompts para texto, código, data/JSON, marketing, estudio, imagen, traducción y resúmenes.",
    locale: "es_AR",
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
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang = (rawLang === "en" ? "en" : "es") as "es" | "en";

  const siteUrl = getSiteUrl();
  const seo = seoForLang(lang);
  const canonical = `${siteUrl}/${lang}`;

  return {
    metadataBase: new URL(siteUrl),
    title: { default: seo.title, template: `%s · Promptea` },
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical,
      languages: { es: `${siteUrl}/es`, en: `${siteUrl}/en` },
    },
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
      url: canonical,
      siteName: "Promptea",
      title: seo.title,
      description: seo.description,
      locale: seo.locale,
      alternateLocale: lang === "en" ? ["es_AR"] : ["en_US"],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
    icons: { icon: "/favicon.ico" },
  };
}

function softwareApplicationJsonLd(lang: "es" | "en") {
  const siteUrl = getSiteUrl();
  const seo = seoForLang(lang);
  const url = `${siteUrl}/${lang}`;

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Promptea",
    description: seo.description,
    url,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
    creator: { "@type": "Organization", name: "Eterlab", url: siteUrl },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
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

  await getDictionary(rawLang as "es" | "en");

  const lang = (rawLang === "en" ? "en" : "es") as "es" | "en";
  const jsonLd = softwareApplicationJsonLd(lang);

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
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

        {/* ✅ JSON-LD: SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
            <TopBar lang={lang} />
            {children}
            <Footer lang={lang} />
          </ToastProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}






