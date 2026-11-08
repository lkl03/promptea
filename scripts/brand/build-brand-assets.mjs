// scripts/brand/build-brand-assets.mjs
//
// v1.8.0 — derives every brand raster from ONE source image:
//   public/brand/promptea-logo-mascot-source.png  (wordmark + mascot, transparent)
//
//   node scripts/brand/build-brand-assets.mjs
//
// Outputs (all committed; re-run only when the source changes):
//   public/brand/promptea-wordmark.webp        wordmark only, ink colour (light backgrounds)
//   public/brand/promptea-wordmark-dark.webp   wordmark only, recoloured for dark backgrounds
//   public/brand/promptea-mascot.webp          mascot only, transparent (hover/tap jump)
//   app/favicon.ico                            16/32/48 (PNG-in-ICO)
//   app/icon.png                               192×192, mascot body on transparent
//   app/apple-icon.png                         180×180, opaque (iOS masks it itself)
//   public/brand/icon-192.png, icon-512.png    manifest "any" icons (transparent)
//   public/brand/icon-512-maskable.png         manifest "maskable" (full-bleed, safe zone)
//   public/brand/mascot-og.png, wordmark-og.png  PNG artwork for next/og (default + share-card OG images)
//
// The crop boxes below were measured from the source's alpha channel (column
// runs): wordmark = x 101–1691, mascot (incl. sparkles) = x 1711–2103, both
// within y 223–568. BrandLogo.tsx recomposes them with the same geometry
// (see COMPOSITION in that file) — change both together.

import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const SRC = "public/brand/promptea-logo-mascot-source.png";

const WORDMARK = { left: 101, top: 223, width: 1691 - 101 + 1, height: 568 - 223 + 1 };
const MASCOT = { left: 1711, top: 227, width: 2103 - 1711 + 1, height: 531 - 227 + 1 };
// Bubble + feet only (no waving hand / sparkles): reads better at 16–48 px.
const MASCOT_BODY = { left: 1711, top: 227, width: 2005 - 1711 + 1, height: 531 - 227 + 1 };

const MINT = { r: 222, g: 250, b: 236 }; // soft mint for opaque tiles
const DARK_INK = { r: 237, g: 242, b: 238 }; // wordmark colour on dark backgrounds

async function crop(box) {
  return sharp(SRC).extract(box).ensureAlpha();
}

/** Recolour every pixel while keeping the alpha channel (clean antialiasing). */
async function recolour(buf, { r, g, b }) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  return sharp(data, { raw: info });
}

/** Square canvas: `box` crop centred at `fill` of the side, over `bg` (or transparent). */
async function squareIcon(box, size, fill, bg) {
  const inner = Math.round(size * fill);
  const piece = await (await crop(box)).resize(inner, inner, { fit: "inside", kernel: "lanczos3" }).png().toBuffer();
  const meta = await sharp(piece).metadata();
  const base = sharp({
    create: { width: size, height: size, channels: 4, background: bg ? { ...bg, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 } },
  });
  return base
    .composite([{ input: piece, left: Math.round((size - meta.width) / 2), top: Math.round((size - meta.height) / 2) }])
    .png({ compressionLevel: 9 });
}

/** PNG-in-ICO (supported by every browser since IE9 / Vista). */
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = header.length + dir.length;
  pngs.forEach(({ size, buf }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.buf)]);
}

async function main() {
  // Wordmark (light + dark) and mascot.
  const wordmark = await (await crop(WORDMARK)).resize({ width: 1000, kernel: "lanczos3" }).png().toBuffer();
  await sharp(wordmark).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile("public/brand/promptea-wordmark.webp");
  await (await recolour(wordmark, DARK_INK)).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile("public/brand/promptea-wordmark-dark.webp");
  await (await crop(MASCOT)).resize({ width: 360, kernel: "lanczos3" }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile("public/brand/promptea-mascot.webp");

  // Favicons: mascot body, transparent, ~92% of the canvas.
  const icoSizes = [16, 32, 48];
  const icoPngs = [];
  for (const size of icoSizes) icoPngs.push({ size, buf: await (await squareIcon(MASCOT_BODY, size, 0.94)).toBuffer() });
  await writeFile("app/favicon.ico", buildIco(icoPngs));
  await (await squareIcon(MASCOT_BODY, 192, 0.9)).toFile("app/icon.png");
  await (await squareIcon(MASCOT, 180, 0.74, MINT)).toFile("app/apple-icon.png");

  // Manifest icons.
  await (await squareIcon(MASCOT, 192, 0.9)).toFile("public/brand/icon-192.png");
  await (await squareIcon(MASCOT, 512, 0.9)).toFile("public/brand/icon-512.png");
  await (await squareIcon(MASCOT, 512, 0.6, MINT)).toFile("public/brand/icon-512-maskable.png");
  // Open Graph artwork (next/og can't read WebP): mascot + ink wordmark as PNG.
  await (await squareIcon(MASCOT, 420, 1)).toFile("public/brand/mascot-og.png");
  await sharp(wordmark).resize({ width: 760 }).png({ compressionLevel: 9 }).toFile("public/brand/wordmark-og.png");

  console.log("brand assets written");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
