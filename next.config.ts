// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: false,
  async redirects() {
    return [
      { source: "/es/", destination: "/es", permanent: true },
      { source: "/en/", destination: "/en", permanent: true },

      { source: "/es/:path+/", destination: "/es/:path+", permanent: true },
      { source: "/en/:path+/", destination: "/en/:path+", permanent: true },
    ];
  },
  async rewrites() {
    // Markdown twins of public pages (v1.8.0): `<page URL>.md` is served by
    // app/md/[lang]/[[...path]]/route.ts. beforeFiles so the dynamic
    // [slug] pages never see a slug such as "json-output.md". proxy.ts skips any
    // path containing a dot, so these requests reach the rewrite untouched.
    return {
      beforeFiles: [
        { source: "/:lang(es|en).md", destination: "/md/:lang" },
        { source: "/:lang(es|en)/:path*.md", destination: "/md/:lang/:path*" },
      ],
    };
  },
};

export default nextConfig;
