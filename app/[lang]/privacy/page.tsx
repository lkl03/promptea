import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const isEs = lang === "es";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">{isEs ? "Política de Privacidad" : "Privacy Policy"}</h1>

      <section className="space-y-3 text-sm opacity-90 leading-relaxed">
        <p>
          {isEs
            ? "Promptea analiza prompts. La telemetría está pensada para ser respetuosa con la privacidad: por defecto no guardamos el texto crudo de tus prompts."
            : "Promptea analyzes prompts. Telemetry is designed to be privacy-friendly: by default we do not store your raw prompt text."}
        </p>

        <h2 className="text-lg font-medium mt-6">{isEs ? "Qué recolectamos" : "What we collect"}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>{isEs ? "Identificador de sesión seudónimo." : "Pseudonymous session identifier."}</li>
          <li>
            {isEs
              ? "Metadatos del análisis: score, confianza, modelo target, idioma, tipo de tarea."
              : "Analysis metadata: score, confidence, target model, language, task type."}
          </li>
          <li>
            {isEs
              ? "IDs de findings/recommendations (ej: “missing_context”, “add_goal”)."
              : "Finding/recommendation IDs (e.g. “missing_context”, “add_goal”)."}
          </li>
          <li>{isEs ? "Feedback opcional (útil: sí/no)." : "Optional feedback (helpful: yes/no)."}</li>
          <li>{isEs ? "Timestamps técnicos para retención/analytics." : "Technical timestamps for retention/analytics."}</li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{isEs ? "Qué NO recolectamos" : "What we do NOT collect"}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {isEs
              ? "No guardamos el prompt completo en telemetría por defecto."
              : "We do not store the full prompt text in telemetry by default."}
          </li>
          <li>{isEs ? "No vendemos datos personales." : "We do not sell personal data."}</li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{isEs ? "Retención" : "Retention"}</h2>
        <p>
          {isEs
            ? "La telemetría se retiene por tiempo limitado con una política TTL (time-to-live) y luego se elimina automáticamente."
            : "Telemetry is retained for a limited time using a TTL (time-to-live) policy and then removed automatically."}
        </p>
      </section>
    </main>
  );
}
