#!/usr/bin/env node
// scripts/showcase/encode.mjs
//
// v1.7.0 — turns a recording from record.mjs into the files the hub serves:
//   public/showcase/promptea-showcase-<lang>.webm   VP9, 1280×720, 30 fps
//   public/showcase/promptea-showcase-<lang>.mp4    H.264 (yuv420p, faststart)
//   public/showcase/promptea-showcase-<lang>.jpg    poster (the hub)
//   public/showcase/promptea-showcase-<lang>.vtt    captions (same text as the strip)
// and, once both languages are encoded and verified with ffprobe, flips
// `available` in lib/showcase.ts.
//
// Screencast frames arrive only when the page repaints, so each frame is held
// until the next one (ffmpeg concat with per-frame durations) and the result
// is resampled to a constant 30 fps.
//
// Usage: node scripts/showcase/encode.mjs --lang=es   (requires ffmpeg + ffprobe on PATH)

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const LANG = args.lang === "en" ? "en" : "es";
const ROOT = process.cwd();
const TMP = join(ROOT, ".showcase-tmp", LANG);
const PUB = join(ROOT, "public", "showcase");
const base = join(PUB, `promptea-showcase-${LANG}`);

const ff = (argv) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...argv], { stdio: "inherit" });

function vttTime(s) {
  const t = Math.max(0, s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = (t % 60).toFixed(3).padStart(6, "0");
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${sec}`;
}

async function main() {
  const meta = JSON.parse(await readFile(join(TMP, "frames.json"), "utf8"));
  const frames = meta.frames;
  if (frames.length < 30) throw new Error(`only ${frames.length} frames — recording failed?`);
  await mkdir(PUB, { recursive: true });

  // 1. Concat list with real per-frame durations.
  const lines = ["ffconcat version 1.0"];
  for (let i = 0; i < frames.length; i++) {
    const dur = i < frames.length - 1 ? Math.min(Math.max(frames[i + 1].t - frames[i].t, 1 / 60), 4) : 1.2;
    lines.push(`file '${frames[i].file}'`, `duration ${dur.toFixed(4)}`);
  }
  lines.push(`file '${frames[frames.length - 1].file}'`);
  const list = join(TMP, "list.ffconcat");
  await writeFile(list, lines.join("\n"));

  // Screencast JPEGs are full-range; Chrome refuses full-range VP9 with
  // MEDIA_ERR_DECODE, so convert to limited (tv) range and tag it as such.
  const vf = "scale=1280:720:flags=lanczos:in_range=pc:out_range=tv,fps=30,format=yuv420p";
  const range = ["-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709"];
  ff(["-f", "concat", "-safe", "0", "-i", list, "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", "23", ...range, "-movflags", "+faststart", "-an", `${base}.mp4`]);
  ff(["-f", "concat", "-safe", "0", "-i", list, "-vf", vf, "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0", ...range, "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-an", `${base}.webm`]);

  // 2. Poster: the hub, ~1.5 s in (after the first paint settles).
  ff(["-ss", "1.5", "-i", `${base}.mp4`, "-frames:v", "1", "-q:v", "3", `${base}.jpg`]);

  // 3. Captions, aligned to the first captured frame.
  const offset = meta.t0 - frames[0].t;
  const vtt = ["WEBVTT", ""];
  meta.cues.forEach((c, i) => {
    vtt.push(String(i + 1), `${vttTime(c.start + offset)} --> ${vttTime((c.end ?? c.start + 3) + offset)}`, c.text, "");
  });
  await writeFile(`${base}.vtt`, vtt.join("\n"));

  // 4. Verify what was written.
  const probe = (f) =>
    JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration,size:stream=codec_name,width,height,color_range", "-of", "json", f]).toString());
  const mp4 = probe(`${base}.mp4`);
  const webm = probe(`${base}.webm`);
  const duration = Math.round(Number(mp4.format.duration) * 10) / 10;
  console.log(`[${LANG}] mp4 ${mp4.streams[0].codec_name} ${mp4.streams[0].width}x${mp4.streams[0].height} ${duration}s ${(mp4.format.size / 1e6).toFixed(2)} MB`);
  console.log(`[${LANG}] webm ${webm.streams[0].codec_name} ${(webm.format.size / 1e6).toFixed(2)} MB`);
  for (const [name, p] of [["mp4", mp4], ["webm", webm]]) {
    if (p.streams[0].color_range !== "tv") throw new Error(`${name} is not limited-range (got ${p.streams[0].color_range}); browsers may refuse to decode it`);
  }

  // 5. Flip the manifest only when every file for both languages exists.
  const all = ["es", "en"].every((l) => ["mp4", "webm", "jpg", "vtt"].every((ext) => existsSync(join(PUB, `promptea-showcase-${l}.${ext}`))));
  if (all) {
    const p = join(ROOT, "lib", "showcase.ts");
    let src = await readFile(p, "utf8");
    src = src.replace(/available: (true|false),/, "available: true,").replace(/durationSeconds: [\d.]+,/, `durationSeconds: ${duration},`);
    await writeFile(p, src);
    console.log("lib/showcase.ts → available: true");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
