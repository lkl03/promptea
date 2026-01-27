export default function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-950" />

      {/* ✅ animated wash */}
      <div className="absolute inset-0 bg-wash opacity-70 dark:opacity-50" />

      {/* ✅ animated orbs */}
      <div className="absolute -top-36 left-1/2 h-130 w-130 -translate-x-1/2 rounded-full blur-3xl
                      bg-cyan-400/25 dark:bg-cyan-500/10 bg-orb-1" />
      <div className="absolute -bottom-44 -right-35 h-140 w-140 rounded-full blur-3xl
                      bg-fuchsia-400/20 dark:bg-fuchsia-500/10 bg-orb-2" />
      <div className="absolute top-[34%] -left-55 h-140 w-140 rounded-full blur-3xl
                      bg-emerald-400/15 dark:bg-emerald-500/10 bg-orb-3" />

      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.10)_75%,rgba(0,0,0,0.18)_100%)]
                      dark:bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.28)_75%,rgba(0,0,0,0.48)_100%)]" />
    </div>
  );
}


