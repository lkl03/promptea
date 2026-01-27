"use client";

export default function AdSlot({ label }: { label: string }) {
  if (process.env.NEXT_PUBLIC_ENABLE_ADS !== "true") return null;

  return (
    <div className="surface p-4 text-sm">
      <div className="font-medium">{label}</div>
      <div className="mt-2 text-xs opacity-70">300x600 / Responsive</div>
    </div>
  );
}
