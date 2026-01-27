import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";

export default async function ChangelogPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const isEs = lang === "es";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Changelog</h1>

      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.0.0</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 27-01-2026" : "Released: 2026-01-27"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Motor modularizado + tests de idempotencia."
              : "Modular engine + idempotency tests."}
          </li>
          <li>
            {isEs
              ? "Capa de lint con IDs estables (findings/recommendations) + detección de formato de salida."
              : "Lint layer with stable IDs + output format detection."}
          </li>
          <li>
            {isEs
              ? "Dataset de calibración ES/EN para validar comportamiento del motor."
              : "ES/EN calibration dataset to validate engine behavior."}
          </li>
          <li>
            {isEs
              ? "UI con headline/bullets basados en scoreExplain + badge de confianza."
              : "UI headline/bullets powered by scoreExplain + confidence badge."}
          </li>
          <li>
            {isEs
              ? "Telemetría en Firestore con TTL + feedback del usuario."
              : "Firestore telemetry with TTL + user feedback."}
          </li>
        </ul>
      </div>
    </main>
  );
}


