"use client";

// components/BrandMascotHop.tsx
//
// v1.8.0 — the only client code behind the logo's mascot. The hop itself is
// CSS (@keyframes mascotHop in globals.css: squash & stretch pivoting on the
// feet). CSS covers mouse hover (:hover on the whole lock-up). A tap on touch
// screens can't be done with :hover/:active alone — the animation would be cut
// the instant the finger lifts — so this island adds a one-shot class on
// pointerdown (touch/pen) and removes it when the animation ends.
//
// Reduced motion: no class is ever added and the CSS animation is disabled,
// so the mascot never jumps.

import { useEffect, useRef } from "react";

export default function BrandMascotHop({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    const host = el?.closest<HTMLElement>(".brand-logo");
    if (!el || !host) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || mq.matches) return; // mouse hover is handled in CSS
      el.classList.remove("is-hopping");
      void el.offsetWidth; // restart the animation on rapid taps
      el.classList.add("is-hopping");
    };
    const onEnd = () => el.classList.remove("is-hopping");
    host.addEventListener("pointerdown", onDown);
    el.addEventListener("animationend", onEnd);
    return () => {
      host.removeEventListener("pointerdown", onDown);
      el.removeEventListener("animationend", onEnd);
    };
  }, []);

  return (
    <span ref={ref} className={className} style={style}>
      {children}
    </span>
  );
}
