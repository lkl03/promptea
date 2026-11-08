"use client";

// components/Portal.tsx
//
// v1.8.0 — renders its children at the end of <body>. Modal dialogs and sheets
// MUST go through this: rendered in place (the feedback modal lived inside the
// page <footer>), Chrome painted parts of the page content over the dialog's
// panel — the "content showing through the modal" bug — even with an opaque
// panel fill. Mounted at the end of <body> the stacking is unambiguous. Nothing
// renders on the server (dialogs are only ever opened by a user action), so
// there is no hydration difference.

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const subscribeNoop = () => () => {};

export default function Portal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  if (!mounted) return null;
  return createPortal(children, document.body);
}
