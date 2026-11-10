// Ambient, theme-aware background: a calm accent wash behind the whole app.
//
// v1.8.0 — the wash is no longer a single static gradient: five soft blobs
// drift in Aqua and Glass. v1.8.1 — the drift is now clearly perceptible
// (closed paths of ~13–16 % of the viewport in 22–38 s, with a gentle change
// of scale and opacity) but never invasive. Pure CSS (see "Ambient motion" in
// globals.css): only transform/opacity animate, on separate layers, so it
// costs no layout/paint work per frame. Metro stays flat;
// prefers-reduced-motion freezes the blobs at the static composition.
// The element is fixed and out of flow, so it can never shift layout.
// Verified with scripts/release/ambient-check.mjs (movement, frame rate, CLS).
export default function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden grain [contain:paint]">
      <div className="ambient absolute inset-0">
        <i className="ambient-blob ambient-blob-1" />
        <i className="ambient-blob ambient-blob-2" />
        <i className="ambient-blob ambient-blob-3" />
        <i className="ambient-blob ambient-blob-4" />
        <i className="ambient-blob ambient-blob-5" />
      </div>
    </div>
  );
}
