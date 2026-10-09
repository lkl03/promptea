// components/BrandLogo.tsx
//
// v1.7.0 — the Promptea wordmark with the mascot (public/brand/).
//
// Two renditions of the same asset: the original (dark wordmark) and a
// derived variant whose wordmark is recoloured for dark backgrounds — the
// mascot is untouched in both. Both are in the markup and CSS shows the one
// that matches the active theme (see .brand-logo-* in globals.css), so the
// server render is identical for every theme: no flash, no hydration
// mismatch. Both load eagerly (~35 KB each as WebP): native lazy-loading
// never fetched the dark rendition when CSS revealed it after a theme switch,
// which left the header without a logo in Glass on a dark system.
//
// The images are decorative copies of the name; the accessible name is the
// visually hidden text "Promptea", which survives whichever rendition CSS
// hides (display:none would drop an alt from the accessibility tree).

import Image from "next/image";

const WIDTH = 960;
const HEIGHT = 177;

type Props = {
  /** Rendered height in CSS pixels; width follows the asset's aspect ratio. */
  height: number;
  /** Optional height from the `sm` breakpoint up. */
  smHeight?: number;
  priority?: boolean;
  className?: string;
};

export default function BrandLogo({ height, smHeight, priority = false, className = "" }: Props) {
  const max = Math.max(height, smHeight ?? height);
  const width = Math.round((max * WIDTH) / HEIGHT);
  const common = {
    width,
    height: max,
    sizes: smHeight ? `(min-width: 640px) ${Math.round((smHeight * WIDTH) / HEIGHT)}px, ${Math.round((height * WIDTH) / HEIGHT)}px` : `${width}px`,
  } as const;
  const style = { "--logo-h": `${height}px`, "--logo-h-sm": `${smHeight ?? height}px` } as React.CSSProperties;
  return (
    <span className={`brand-logo inline-flex h-[var(--logo-h)] sm:h-[var(--logo-h-sm)] ${className}`} style={style}>
      <span className="sr-only">Promptea</span>
      <Image
        {...common}
        src="/brand/promptea-logo.webp"
        alt=""
        aria-hidden="true"
        priority={priority}
        loading={priority ? undefined : "eager"}
        className="brand-logo-light h-full w-auto select-none"
        draggable={false}
      />
      <Image
        {...common}
        src="/brand/promptea-logo-dark.webp"
        alt=""
        aria-hidden="true"
        loading="eager"
        className="brand-logo-dark h-full w-auto select-none"
        draggable={false}
      />
    </span>
  );
}
