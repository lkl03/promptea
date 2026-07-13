// Ambient, theme-aware background: a calm accent wash + fine grain.
// Pure CSS (tokens defined in globals.css) — adapts to every theme with no
// per-theme code here, and is static so it costs nothing under
// prefers-reduced-motion.
export default function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden grain">
      <div className="ambient absolute inset-0" />
    </div>
  );
}
