// Ambient, theme-aware background: a calm accent wash behind the whole app.
//
// v1.8.0 — the wash is no longer a single static gradient: five soft blobs
// drift slowly (30–60 s legs) in Aqua and Glass. Pure CSS (see "Ambient
// motion" in globals.css): only transform/opacity animate, on separate
// layers, so it costs no layout/paint work per frame. Metro stays flat;
// prefers-reduced-motion freezes the blobs at the old static composition.
// The element is fixed and out of flow, so it can never shift layout.
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
