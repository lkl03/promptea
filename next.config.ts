// next.config.ts
import type { NextConfig } from "next";

import { LANGS } from "./lib/domain";

// Every locale, from the single list in lib/domain.ts: "es|en|pt".
const LOCALE_ALT = LANGS.join("|");

/**
 * v1.8.3 — baseline security headers for every response (the platform only
 * added Strict-Transport-Security). Deliberately NOT a Content-Security-Policy:
 * the page loads third-party scripts whose origins change (the Elfsight X feed,
 * optional Google Ads, Vercel Analytics) and a wrong policy breaks them
 * silently; that needs its own rollout in report-only mode.
 *   - nosniff: never let a browser reinterpret a response's type;
 *   - SAMEORIGIN framing: no other site can frame Promptea (clickjacking);
 *   - Referrer-Policy: other sites get the origin, never the path or query
 *     (a legacy /analyzer?prompt=… link would otherwise leak the prompt);
 *   - Permissions-Policy: the microphone stays available to this origin only
 *     (voice dictation); camera, geolocation and the rest are off.
 */
export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  trailingSlash: false,
  // Do not advertise the framework in every response.
  poweredByHeader: false,
  // Next 16.3+: `next dev` writes an AGENTS.md block whenever it detects an AI
  // coding agent. Agent sessions on this repo would leave that untracked file
  // behind on every run; the docs it points to stay in node_modules/next/dist/docs.
  agentRules: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async redirects() {
    return [
      ...LANGS.map((l) => ({ source: `/${l}/`, destination: `/${l}`, permanent: true })),
      ...LANGS.map((l) => ({ source: `/${l}/:path+/`, destination: `/${l}/:path+`, permanent: true })),
    ];
  },
  async rewrites() {
    // Markdown twins of public pages (v1.8.0): `<page URL>.md` is served by
    // app/md/[lang]/[[...path]]/route.ts. beforeFiles so the dynamic
    // [slug] pages never see a slug such as "json-output.md". proxy.ts skips any
    // path containing a dot, so these requests reach the rewrite untouched.
    return {
      beforeFiles: [
        { source: `/:lang(${LOCALE_ALT}).md`, destination: "/md/:lang" },
        { source: `/:lang(${LOCALE_ALT})/:path*.md`, destination: "/md/:lang/:path*" },
      ],
    };
  },
};

export default nextConfig;
