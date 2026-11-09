// app/[lang]/twitter-image.tsx — v1.8.0. Same artwork as opengraph-image.tsx; Next only
// emits <meta name="twitter:image"> from a twitter-image convention file. The route
// config must be literal in this file, the renderer is shared.

export { default, generateStaticParams } from "./opengraph-image";

export const alt = "Promptea";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
