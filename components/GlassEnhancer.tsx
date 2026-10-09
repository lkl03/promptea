"use client";

// components/GlassEnhancer.tsx
//
// v1.7.0 — optional refraction for the Glass theme.
//
// The Glass theme is pure CSS (blur + translucent fill + luminous edges) and
// works everywhere. This island adds one progressive enhancement: an SVG
// displacement filter used as a backdrop filter on the few surfaces marked
// `.glass-refract` (hub cards), which bends the background slightly at the
// edges like real glass.
//
// Only Chromium renders `backdrop-filter: url(#…)` correctly (Safari and
// Firefox either ignore it or blank the surface), so the attribute that turns
// it on is set only when:
//   - the active theme is glass,
//   - the engine identifies as Chromium (User-Agent Client Hints),
//   - the user has not asked for reduced transparency or reduced motion.
// Nothing renders on the server and nothing changes layout, so there is no
// hydration difference: the attribute lands on <html>, which already carries
// suppressHydrationWarning for next-themes.

import { useEffect } from "react";
import { useTheme } from "next-themes";

type UAData = { brands?: Array<{ brand: string }> };

function refractionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const ua = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
  const chromium = Boolean(ua?.brands?.some((b) => /Chromium/i.test(b.brand)));
  if (!chromium) return false;
  const reduced =
    window.matchMedia("(prefers-reduced-transparency: reduce)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return !reduced;
}

export default function GlassEnhancer() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "glass" && refractionSupported()) root.dataset.glassFx = "refract";
    else delete root.dataset.glassFx;
  }, [resolvedTheme]);

  // The filter definition is inert unless a surface references it.
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute", width: 0, height: 0 }}>
      <filter id="promptea-glass-refract" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="1" seed="7" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
        <feDisplacementMap in="SourceGraphic" in2="soft" scale="18" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
