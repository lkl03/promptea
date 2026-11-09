// components/BrandLogo.tsx
//
// The Promptea wordmark with the mascot (public/brand/).
//
// v1.8.0 — the mascot is its own asset so it can react: it hops (squash &
// stretch, pure CSS) on hover and on tap. The wordmark (two renditions: ink
// for light backgrounds, a recoloured one for dark) and the mascot are
// recomposed here with the exact geometry of the original lock-up
// (COMPOSITION, measured by scripts/brand/build-brand-assets.mjs — change both
// together). The box has a fixed aspect ratio and every piece is positioned in
// percentages, so nothing moves while images load (no CLS).
//
// Both wordmark renditions are in the markup and CSS shows the one that matches
// the active theme (see .brand-logo-* in globals.css), so the server render is
// identical for every theme: no flash, no hydration mismatch. They load
// eagerly (~30 KB WebP each): native lazy-loading never fetched the dark one
// when CSS revealed it after a theme switch.
//
// The images are decorative copies of the name; the accessible name is the
// visually hidden text "Promptea", which survives whichever rendition CSS
// hides (display:none would drop an alt from the accessibility tree).

import Image from "next/image";
import BrandMascotHop from "./BrandMascotHop";

/** Source pixels (promptea-logo-mascot-source.png) of the full lock-up and its parts. */
const COMPOSITION = {
  width: 2002,
  height: 345,
  wordmark: { left: 0, top: 0, width: 1591, height: 345 },
  mascot: { left: 1610, top: 4, width: 393, height: 305 },
} as const;

const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(3)}%`;

type Props = {
  /** Rendered height in CSS pixels; width follows the lock-up's aspect ratio. */
  height: number;
  /** Optional height from the `sm` breakpoint up. */
  smHeight?: number;
  priority?: boolean;
  className?: string;
};

export default function BrandLogo({ height, smHeight, priority = false, className = "" }: Props) {
  const { width: W, height: H, wordmark, mascot } = COMPOSITION;
  const max = Math.max(height, smHeight ?? height);
  const boxW = Math.round((max * W) / H);
  const wordW = Math.round((boxW * wordmark.width) / W);
  const mascotW = Math.round((boxW * mascot.width) / W);
  const style = {
    "--logo-h": `${height}px`,
    "--logo-h-sm": `${smHeight ?? height}px`,
    aspectRatio: `${W} / ${H}`,
  } as React.CSSProperties;
  const fill = "absolute select-none";

  return (
    <span className={`brand-logo relative inline-block h-[var(--logo-h)] sm:h-[var(--logo-h-sm)] ${className}`} style={style}>
      <span className="sr-only">Promptea</span>
      <span
        aria-hidden="true"
        className="absolute"
        style={{ left: pct(wordmark.left, W), top: pct(wordmark.top, H), width: pct(wordmark.width, W), height: pct(wordmark.height, H) }}
      >
        <Image
          src="/brand/promptea-wordmark.webp"
          alt=""
          width={wordW}
          height={Math.round((wordW * wordmark.height) / wordmark.width)}
          sizes={`${wordW}px`}
          priority={priority}
          loading={priority ? undefined : "eager"}
          className="brand-logo-light h-full w-full select-none"
          draggable={false}
        />
        <Image
          src="/brand/promptea-wordmark-dark.webp"
          alt=""
          width={wordW}
          height={Math.round((wordW * wordmark.height) / wordmark.width)}
          sizes={`${wordW}px`}
          loading="eager"
          className="brand-logo-dark h-full w-full select-none"
          draggable={false}
        />
      </span>
      <BrandMascotHop
        className={`brand-mascot ${fill}`}
        style={{ left: pct(mascot.left, W), top: pct(mascot.top, H), width: pct(mascot.width, W), height: pct(mascot.height, H) }}
      >
        <Image
          src="/brand/promptea-mascot.webp"
          alt=""
          width={mascotW}
          height={Math.round((mascotW * mascot.height) / mascot.width)}
          sizes={`${mascotW}px`}
          priority={priority}
          loading={priority ? undefined : "eager"}
          className="h-full w-full select-none"
          draggable={false}
        />
      </BrandMascotHop>
    </span>
  );
}
