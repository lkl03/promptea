import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "en" ? "en" : "es";
  return pageMetadata({
    lang: l,
    path: `/${l}/privacy`,
    title: l === "es" ? "Política de privacidad" : "Privacy policy",
    description:
      l === "es"
        ? "Qué recolecta Promptea (metadatos del análisis, no el texto de tus prompts), qué no recolecta, cómo funciona el dictado por voz y el feedback."
        : "What Promptea collects (analysis metadata, not your prompt text), what it does not, and how voice dictation and feedback are handled.",
  });
}

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

        <h2 className="text-lg font-medium mt-6">{isEs ? "Newsletter (Promptea Semanal)" : "Newsletter (Promptea Weekly)"}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {isEs
              ? "Si te suscribís al newsletter, guardamos tu dirección de email, tu preferencia de idioma y la fecha de suscripción."
              : "If you subscribe to the newsletter, we store your email address, language preference, and subscription date."}
          </li>
          <li>
            {isEs
              ? "Tu email se usa exclusivamente para enviarte el newsletter semanal. No lo compartimos con terceros ni lo usamos para otros fines."
              : "Your email is used exclusively to send you the weekly newsletter. We do not share it with third parties or use it for other purposes."}
          </li>
          <li>
            {isEs
              ? "Tu email nunca aparece en logs del servidor, en telemetría ni en analytics. Internamente almacenamos un hash criptográfico para detectar duplicados."
              : "Your email never appears in server logs, telemetry, or analytics. Internally we store a cryptographic hash for duplicate detection."}
          </li>
          <li>
            {isEs
              ? "Podés desuscribirte en cualquier momento usando el enlace incluido en cada edición del newsletter."
              : "You can unsubscribe at any time using the link included in every newsletter edition."}
          </li>
          <li>
            {isEs
              ? "El envío se realiza a través de Resend, nuestro proveedor de email. Consultá su política de privacidad en resend.com/legal/privacy-policy."
              : "Delivery is handled by Resend, our email provider. See their privacy policy at resend.com/legal/privacy-policy."}
          </li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{isEs ? "Feed de X (contenido de terceros)" : "X feed (third-party content)"}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {isEs
              ? "La página de inicio puede mostrar el timeline oficial de X (Twitter). Es contenido de un tercero: lo carga y lo sirve X Corp. desde platform.twitter.com y x.com."
              : "The home page can show the official X (Twitter) timeline. It is third-party content, loaded and served by X Corp. from platform.twitter.com and x.com."}
          </li>
          <li>
            {isEs
              ? "No se carga automáticamente: solo después de que presionás “Cargar el feed”. Hasta ese momento no se hace ningún pedido a X desde la página."
              : "It is not loaded automatically: only after you press “Load the feed”. Until then the page makes no request to X."}
          </li>
          <li>
            {isEs
              ? "Al cargarlo, X puede recibir tu dirección IP y datos de tu navegador, y puede usar cookies o almacenamiento propio, según su política de privacidad (x.com/privacy). Pedimos a X que no use el widget para personalizar (dnt). Promptea no recibe esos datos."
              : "When loaded, X may receive your IP address and browser data and may use its own cookies or storage, as described in its privacy policy (x.com/privacy). We ask X not to use the widget for personalization (dnt). Promptea does not receive that data."}
          </li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{isEs ? "Almacenamiento en tu navegador" : "Storage in your browser"}</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            {isEs
              ? "Guardamos en tu navegador (localStorage), sin enviarlo a ningún servidor: el tema visual elegido, si cerraste los avisos del newsletter (para no volver a mostrártelos por unos días) y si ya te suscribiste."
              : "We keep in your browser (localStorage), without sending it to any server: your chosen visual theme, whether you dismissed the newsletter prompts (so they are not shown again for a few days) and whether you already subscribed."}
          </li>
          <li>
            {isEs
              ? "La Biblioteca de prompts guarda tus análisis recientes (el prompt original y el optimizado, el puntaje y la fecha) únicamente en tu navegador. Esos prompts no salen de tu dispositivo por el hecho de estar en la Biblioteca, no tenemos acceso a ellos y no se sincronizan. Podés borrarlos uno por uno o todos juntos desde la Biblioteca, o limpiando los datos del sitio en tu navegador."
              : "The Prompt Library keeps your recent analyses (the original and optimized prompt, the score and the date) only in your browser. Those prompts do not leave your device because they are in the Library, we have no access to them and they are not synced. You can delete them one by one or all at once from the Library, or by clearing the site data in your browser."}
          </li>
          <li>
            {isEs
              ? "Las tarjetas compartibles del resultado codifican en la URL solo el puntaje y su desglose, nunca el texto del prompt."
              : "Shareable result cards encode only the score and its breakdown in the URL, never the prompt text."}
          </li>
        </ul>

        <h2 className="text-lg font-medium mt-6">{isEs ? "Retención" : "Retention"}</h2>
        <p>
          {isEs
            ? "La telemetría se retiene por tiempo limitado con una política TTL (time-to-live) y luego se elimina automáticamente. El feedback general se conserva mientras sea útil para mejorar el producto. Los datos de suscripción al newsletter se conservan mientras tu suscripción esté activa; al desuscribirte, tu email se marca como inactivo."
            : "Telemetry is retained for a limited time using a TTL (time-to-live) policy and then removed automatically. General feedback is kept for as long as it is useful for improving the product. Newsletter subscription data is kept while your subscription is active; upon unsubscribing, your email is marked inactive."}
        </p>
      </section>
    </main>
  );
}
