"use client";

// components/benchmarks/BenchDialog.tsx
//
// v1.8.7 — the dialog shell of the benchmarks page (model analysis, model
// comparison). A real modal: rendered at the end of <body> (components/Portal),
// role="dialog" + aria-modal, focus moved inside on open ([data-autofocus]) and
// trapped (lib/useFocusTrap), Esc and the backdrop close it, focus returns to
// whatever opened it, the page behind does not scroll. On phones it is a bottom
// sheet (full width, rounded top, safe-area padding); from `sm` up a centred
// panel. Reduced motion: no slide, the fade only (.animate-toast-in).

import { useEffect, useRef } from "react";
import Portal from "@/components/Portal";
import { useFocusTrap } from "@/lib/useFocusTrap";

export default function BenchDialog({
  open,
  onClose,
  titleId,
  descId,
  children,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  descId?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => {
      const target = ref.current?.querySelector<HTMLElement>("[data-autofocus]") ?? ref.current;
      target?.focus();
    });
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="presentation">
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          tabIndex={-1}
          className="bm-dialog surface relative flex max-h-[88dvh] w-full animate-toast-in flex-col overflow-hidden rounded-b-none pb-[env(safe-area-inset-bottom)] outline-none sm:max-h-[86dvh] sm:max-w-3xl sm:rounded-2xl sm:pb-0"
        >
          {children}
        </div>
      </div>
    </Portal>
  );
}
