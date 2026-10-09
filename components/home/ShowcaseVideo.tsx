"use client";

// components/home/ShowcaseVideo.tsx
//
// v1.7.0 — the product showcase on the hub. The video is a real automated
// recording of the v1.7.0 interface (see scripts/showcase/README.md for how
// to regenerate it); lib/showcase.ts says whether the rendered files exist.
//
// Loading and motion:
//   - preload="none" + a poster: nothing but the poster is fetched until the
//     visitor plays it or it scrolls into view.
//   - Autoplay happens only when the video is at least half visible, always
//     muted, and never when the visitor prefers reduced motion. It pauses
//     when it scrolls away and never resumes after the visitor paused it.
//   - Native controls (play/pause, seek, fullscreen, captions) are always on.
//   - WebM (VP9) first, MP4 (H.264) fallback; captions in both languages (a
//     WebVTT track, off by default because the frames carry the same strip).

import { useEffect, useRef } from "react";
import { SHOWCASE } from "@/lib/showcase";

type Props = { lang: "es" | "en"; caption: string; pending: string; title: string };

export default function ShowcaseVideo({ lang, caption, pending, title }: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const userPaused = useRef(false);
  const auto = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video || !SHOWCASE.available) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onPause = () => {
      // A pause we did not cause (controls, keyboard) is the visitor's choice.
      if (!auto.current) userPaused.current = true;
      auto.current = false;
    };
    video.addEventListener("pause", onPause);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!userPaused.current && video.paused && !video.ended) {
            video.muted = true;
            void video.play().catch(() => {});
          }
        } else if (!video.paused) {
          auto.current = true;
          video.pause();
        }
      },
      { threshold: [0, 0.5] }
    );
    io.observe(video);
    return () => {
      io.disconnect();
      video.removeEventListener("pause", onPause);
    };
  }, []);

  if (!SHOWCASE.available) {
    return (
      <div className="surface-soft flex aspect-video items-center justify-center p-6 text-center text-sm text-ink-muted">
        {pending}
      </div>
    );
  }

  return (
    <figure className="m-0">
      <div className="surface overflow-hidden p-1.5 sm:p-2">
        <video
          ref={ref}
          className="block aspect-video w-full rounded-[14px] bg-canvas-deep"
          controls
          muted
          playsInline
          preload="none"
          poster={SHOWCASE.poster[lang]}
          width={SHOWCASE.width}
          height={SHOWCASE.height}
          aria-label={title}
        >
          <source src={SHOWCASE.webm[lang]} type="video/webm" />
          <source src={SHOWCASE.mp4[lang]} type="video/mp4" />
          {/* Off by default: the recording already carries the same caption strip. */}
          <track kind="captions" src={SHOWCASE.captions[lang]} srcLang={lang} label={lang === "es" ? "Español" : "English"} />
        </video>
      </div>
      <figcaption className="mt-2 text-center text-xs text-ink-muted">{caption}</figcaption>
    </figure>
  );
}
