// next.config.ts
import type { NextConfig } from "next";

import { LANGS } from "./lib/domain";

// Every locale, from the single list in lib/domain.ts: "es|en|pt".
const LOCALE_ALT = LANGS.join("|");

const nextConfig: NextConfig = {
  trailingSlash: false,
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
