# Product showcase video

The hub (`/[lang]`) embeds a short tour of the real app. It is **recorded from
the running interface**, not composited: a headless Chrome drives the UI while
the Chrome DevTools screencast captures every painted frame. The recorder only
adds a visible cursor and a caption strip naming each step (the same captions
ship as WebVTT for screen readers and muted playback).

Tour: hub → *Analyze a prompt* (pick Claude, purpose Marketing, type a demo
prompt, analyze) → results → copy the optimized prompt → *Find the best AI*
(demo task) → AI Daily → Weekly digest → latest edition → Benchmarks → hub.

The demo prompt and task are sample text written for the video; no personal
or private data is used. Whatever state a page is genuinely in is what gets
recorded (for example, Benchmarks shows its empty state when no OpenRouter key
is configured) — nothing is faked.

## Regenerate

Requirements: Node 20+, Google Chrome (or set `CHROME_PATH`), `ffmpeg` and
`ffprobe` on `PATH`, and `.env.local` with the Firebase variables if you want
real AI Daily / Weekly content in the recording.

```bash
npm run build
npx next start -p 3060
```

In a second terminal:

```bash
npm run showcase:record -- --base=http://localhost:3060 --lang=es
npm run showcase:encode -- --lang=es
npm run showcase:record -- --base=http://localhost:3060 --lang=en
npm run showcase:encode -- --lang=en
```

Outputs, per language, in `public/showcase/`:

| File | What |
| --- | --- |
| `promptea-showcase-<lang>.webm` | VP9, 1280×720, 30 fps (served first) |
| `promptea-showcase-<lang>.mp4` | H.264 yuv420p with `faststart` (fallback) |
| `promptea-showcase-<lang>.jpg` | Poster (the hub) |
| `promptea-showcase-<lang>.vtt` | Captions |

`encode.mjs` verifies the files with `ffprobe` and, once both languages
exist, sets `available: true` and the duration in `lib/showcase.ts`. Until
then the hub shows a "being generated" note instead of an empty player.
Raw frames go to `.showcase-tmp/` (git-ignored).

Options: `--theme=glass|aqua|metro` (default `glass`), `CHROME_PATH=…`.

## Playback behaviour (components/home/ShowcaseVideo.tsx)

`preload="none"` with a poster, native controls, muted autoplay only while at
least half visible and never under `prefers-reduced-motion`; it pauses when
scrolled away and never resumes after the viewer paused it.
