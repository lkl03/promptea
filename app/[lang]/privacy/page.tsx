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

        <h2 className="text-lg font-medium mt-6">{isEs ? "Dictado por voz" : "Voice dictation"}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {isEs
              ? "La grabación ocurre solo cuando vos la iniciás y podés cancelarla en cualquier momento."
              : "Recording happens only when you start it, and you can cancel at any time."}
          </li>
          <li>
            {isEs
              ? "El audio se envía a nuestro proveedor de transcripción (Groq) únicamente para convertirlo en texto y se descarta después: no guardamos el audio en ningún lado — ni en base de datos, ni en telemetría, ni en logs."
              : "Audio is sent to our transcription provider (Groq) solely to convert it into text and is discarded afterwards: we never store audio anywhere — not in our database, telemetry, or logs."}
          </li>
          <li>
            {isEs
              ? "La transcripción se devuelve a tu navegador para que la revises. No se guarda, salvo que vos decidas usarla en un análisis (donde aplican las mismas reglas que a cualquier prompt)."
              : "The transcript is returned to your browser for review. It is not stored unless you choose to use it in an analysis (where the same rules as any prompt apply)."}
          </li>
          <li>
            {isEs
              ? "En telemetría solo registramos eventos operativos tipificados (grabación iniciada, transcripción exitosa o motivo de error), nunca el contenido."
              : "Telemetry records only typed operational events (recording started, transcription succeeded, or a failure reason), never the content."}
          </li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{isEs ? "Feedback general de la app" : "General app feedback"}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {isEs
              ? "Si enviás feedback desde el botón “Feedback”, guardamos tu mensaje junto con: categoría opcional, idioma, página/modo, versión de la app, tema visual y un hash anónimo de sesión."
              : "If you send feedback via the “Feedback” button, we store your message together with: optional category, language, page/mode, app version, visual theme, and an anonymous session hash."}
          </li>
          <li>
            {isEs
              ? "No guardamos tu prompt junto con el feedback, ni pedimos email ni datos de contacto."
              : "We do not store your prompt with the feedback, and we do not ask for email or contact details."}
          </li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{isEs ? "Retención" : "Retention"}</h2>
        <p>
          {isEs
            ? "La telemetría se retiene por tiempo limitado con una política TTL (time-to-live) y luego se elimina automáticamente. El feedback general se conserva mientras sea útil para mejorar el producto."
            : "Telemetry is retained for a limited time using a TTL (time-to-live) policy and then removed automatically. General feedback is kept for as long as it is useful for improving the product."}
        </p>
      </section>
    </main>
  );
}
