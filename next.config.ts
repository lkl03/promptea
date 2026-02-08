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
};

export default nextConfig;
