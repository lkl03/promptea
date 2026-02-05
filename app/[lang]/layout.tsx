// app/[lang]/layout.tsx
import "../globals.css";
import { getDictionary, hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";
import { Montserrat, Quicksand } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";

import Providers from "@/components/Providers";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";
import ToastProvider from "@/components/ToastProvider";

const X_PIXEL_ID = process.env.NEXT_PUBLIC_X_PIXEL_ID;

const titleFont = Montserrat({
  subsets: ["latin"],
  variable: "--font-title",
  display: "swap",
  weight: ["500", "600", "700"],
});

const bodyFont = Quicksand({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.trim().length > 0) {
    return env.startsWith("http") ? env : `https://${env}`;
  }
  const vercel = process.env.VERCEL_URL;
  if (vercel && vercel.trim().length > 0) {
    return `https://${vercel}`;
  }
  return "http://localhost:3000";
}

function seoForLang(lang: "es" | "en") {
  if (lang === "en") {
    return {
      title: "Promptea — Prompt analyzer & optimizer for GPT, Gemini, Claude, Grok",
      description:
        "Analyze your prompt, detect issues, and generate an optimized version tailored to each AI and your goal (text, study, code, data/JSON, image, marketing).",
      locale: "en_US",
    };
  }
  return {
    title: "Promptea — Analizá y optimizá prompts para GPT, Gemini, Claude, Grok",
    description:
      "Analizá tu prompt, detectá problemas y generá una versión optimizada según la IA y tu objetivo (texto, estudio, código, data/JSON, imagen, marketing).",
    locale: "es_AR",
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang = (rawLang === "en" ? "en" : "es") as "es" | "en";

  const siteUrl = getSiteUrl();
  const seo = seoForLang(lang);

  // canonical del root por idioma (las páginas hijas pueden overridear metadata si quieren)
  const canonical = `${siteUrl}/${lang}`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: seo.title,
      template: `%s · Promptea`,
    },
    description: seo.description,
    alternates: {
      canonical,
      languages: {
        es: `${siteUrl}/es`,
        en: `${siteUrl}/en`,
      },
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
    icons: {
      icon: "/favicon.ico",
    },
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
    creator: {
      "@type": "Organization",
      name: "Eterlab",
      url: siteUrl,
    },
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

  // mantiene tu flujo actual (y valida diccionario)
  await getDictionary(rawLang as any);

  const lang = (rawLang === "en" ? "en" : "es") as "es" | "en";
  const jsonLd = softwareApplicationJsonLd(lang);

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        {/* ✅ JSON-LD: SoftwareApplication */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>

             {/* ✅ X Pixel (Universal Website Tag) */}
        {X_PIXEL_ID && (
          <Script
            id="x-pixel"
            strategy="afterInteractive"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: `
                !(function(e,t,n,s,u,a){
                  e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},
                  s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,
                  u.src='https://static.ads-twitter.com/uwt.js',
                  a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))
                }(window,document,'script'));
                twq('init','${X_PIXEL_ID}');
                twq('track','PageView');
              `,
            }}
          />
        )}

      <body
        className={[
          titleFont.variable,
          bodyFont.variable,
          "font-body min-h-dvh",
          "bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50",
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





