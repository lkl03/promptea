import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";

export default async function ChangelogPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const isEs = lang === "es";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Changelog</h1>

      {/* v1.1.2 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.1.2</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 31-05-2026" : "Released: 2026-05-31"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Navegación persistente: wordmark de Promptea + links a Analizador, Prompts, Guías, Modelos y Glosario en todas las páginas públicas."
              : "Persistent navigation: Promptea wordmark + links to Analyzer, Prompts, Guides, Models, and Glossary across all public pages."}
          </li>
          <li>
            {isEs
              ? "Flujo del analizador reordenado: elegís el tipo de prompt antes de escribir, lo que deja claro cuándo los adjuntos están disponibles."
              : "Reordered analyzer flow: prompt type is selected before writing, making attachment availability clear upfront."}
          </li>
          <li>
            {isEs
              ? "Contador en vivo de palabras y tokens aproximados mientras escribís el prompt."
              : "Live word and approximate token counter while writing the prompt."}
          </li>
          <li>
            {isEs
              ? "Helper de ejemplo: botón para precargar un prompt de muestra con tipo y modelo compatible."
              : "Example helper: button to prefill a sample prompt with a compatible type and model."}
          </li>
          <li>
            {isEs
              ? "El estado del formulario (prompt, tipo, modelo, formato) se persiste en sessionStorage y se restaura al cambiar de idioma."
              : "Form state (prompt, type, model, format) is persisted in sessionStorage and restored on language switch."}
          </li>
          <li>
            {isEs
              ? "Focus trap en modales: Tab/Shift+Tab quedan dentro del diálogo y el foco vuelve al trigger al cerrar."
              : "Focus trap in modals: Tab/Shift+Tab stay inside the dialog and focus returns to the trigger on close."}
          </li>
          <li>
            {isEs
              ? "El feedback de utilidad (Sí/No) se muestra después del contenido completo del análisis, no antes."
              : "Helpfulness feedback (Yes/No) now appears after the full analysis content, not before."}
          </li>
          <li>
            {isEs
              ? "Etiqueta cualitativa de calidad en el ring: Débil (0–30), Regular (31–60), Bueno (61–85), Excelente (86–100)."
              : "Qualitative score label inside the quality ring: Weak (0–30), Fair (31–60), Good (61–85), Excellent (86–100)."}
          </li>
          <li>
            {isEs
              ? "Prompt optimizado mejorado: nota explicativa sobre las líneas de encabezado, mayor altura máxima y confirmación visual ¡Copiado! al copiar."
              : "Improved optimized prompt: explanatory note about header lines, increased max height, and Copied! visual confirmation on copy."}
          </li>
          <li>
            {isEs
              ? "Badges de cantidad en los packs de prompts (ej: 6 prompts) y CTA Abrir analizador en páginas de cada pack."
              : "Count badges on prompt packs (e.g. 6 prompts) and Open Analyzer CTA on each pack subpage."}
          </li>
          <li>
            {isEs
              ? "Trigger ¿Cómo funciona? rediseñado como badge/pill más visible para usuarios nuevos."
              : "How this works trigger redesigned as a more visible badge/pill for new users."}
          </li>
          <li>
            {isEs
              ? "Footer: separadores | reemplazados por espaciado CSS, landmark nav, copyright con formato natural."
              : "Footer: | separators replaced with CSS gap, nav landmark, naturally formatted copyright text."}
          </li>
          <li>
            {isEs
              ? "Nota interna de SEO sobre indexación eliminada de la página pública de Guías."
              : "Internal SEO indexing note removed from the public Guides page."}
          </li>
        </ul>
      </div>

      {/* v1.1.1 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.1.1</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 30-04-2026" : "Released: 2026-04-30"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Análisis de prompts más adaptable: el output ahora cambia según el modelo (GPT, Claude, Gemini, Grok, DeepSeek, Kimi) y muestra notas específicas para el modelo elegido."
              : "More adaptive prompt analysis: output now changes depending on the selected model (GPT, Claude, Gemini, Grok, DeepSeek, Kimi) and shows model-specific notes."}
          </li>
          <li>
            {isEs
              ? "Registro centralizado de modelos con submodelos (GPT-4.1 / GPT-4o / GPT-4o mini / o3, Sonnet / Opus / Haiku, Gemini Pro / Flash, Grok, DeepSeek, Kimi y Llama 3) y selector de submodelo cuando el target lo soporta."
              : "Centralized model registry with submodels (GPT-4.1 / GPT-4o / GPT-4o mini / o3, Sonnet / Opus / Haiku, Gemini Pro / Flash, Grok, DeepSeek, Kimi and Llama 3) and a submodel selector when the target supports it."}
          </li>
          <li>
            {isEs
              ? "Scoring más personalizado por caso de uso: criterios visibles para coding, debugging, refactor, data, marketing, estudio, imagen, research y texto."
              : "More personalized scoring per use case: visible criteria for coding, debugging, refactor, data, marketing, study, image, research, and text."}
          </li>
          <li>
            {isEs
              ? "Feedback más concreto: nuevos bloques “lo que ya está bien”, “quick wins”, “preguntas que ayudarían” y “notas para este modelo” en el panel de resultados."
              : "More actionable feedback: new “what works already”, “quick wins”, “helpful follow-up questions”, and “notes for this model” blocks in the results panel."}
          </li>
          <li>
            {isEs
              ? "Selector de formato del prompt optimizado: Checklist (legible) o JSON puro (estricto y parseable) con tooltip explicativo."
              : "Optimized prompt format toggle: Checklist (human-readable) or pure JSON (strict and parseable) with an explanatory tooltip."}
          </li>
          <li>
            {isEs
              ? "Mejor UX de adjuntos: copy más claro sobre formatos soportados, límites por archivo y total visibles."
              : "Improved attachment UX: clearer copy about supported formats, per-file size limits, and total caps."}
          </li>
          <li>
            {isEs
              ? "Integración opcional con Groq para hints adicionales — desactivada por defecto. Configurá GROQ_API_KEY en Vercel para habilitarla; si no está, la app sigue usando el motor local sin cambios."
              : "Optional Groq integration for extra hints — disabled by default. Set GROQ_API_KEY in Vercel to enable it; without the key, the app keeps using the local engine unchanged."}
          </li>
          <li>
            {isEs
              ? "Toggle de tema claro/oscuro reactivado con respeto por la preferencia del sistema."
              : "Light/dark theme toggle re-enabled with system preference respected."}
          </li>
          <li>
            {isEs
              ? "Nuevo “Prompt del día” con rotación determinista por fecha: ficha lateral pegajosa en desktop y plegable en mobile."
              : "New “Prompt of the Day” with deterministic per-date rotation: sticky aside on desktop, collapsible on mobile."}
          </li>
          <li>
            {isEs
              ? "Modal “¿Cómo funciona?” con accesibilidad (ESC, focus inicial, aria) explicando el flujo paso a paso."
              : "Accessible “How this works” modal (ESC to close, initial focus, ARIA) explaining the flow step by step."}
          </li>
          <li>
            {isEs
              ? "Nuevas landings SEO: /landing/prompt-analyzer, /ai-prompt-optimizer, /prompt-scoring, /json-prompt-generator, /coding-prompt-generator y /prompt-generator-for-{claude,chatgpt,gemini}."
              : "New SEO landings: /landing/prompt-analyzer, /ai-prompt-optimizer, /prompt-scoring, /json-prompt-generator, /coding-prompt-generator, and /prompt-generator-for-{claude,chatgpt,gemini}."}
          </li>
          <li>
            {isEs
              ? "Sitemap, keywords y metadata refinados; canonical y alternates por idioma actualizados."
              : "Refined sitemap, keywords, and metadata; canonical and per-language alternates updated."}
          </li>
          <li>
            {isEs
              ? "Tests adicionales: registro de modelos, salida JSON parseable, rotación del prompt diario y wiring de la opción format en el motor."
              : "Additional tests: model registry, parseable JSON output, daily prompt rotation, and engine wiring of the format option."}
          </li>
        </ul>
      </div>

      {/* v1.1.0 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.1.0</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 10-03-2026" : "Released: 2026-03-10"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Motor refinado y más personalizado según el tipo de tarea: scoring, findings y recomendaciones ahora distinguen mejor entre resumen, traducción, código, datos, estudio, marketing y otros casos."
              : "Refined engine with more task-aware behavior: scoring, findings, and recommendations now better distinguish between summarization, translation, code, data, study, marketing, and other use cases."}
          </li>
          <li>
            {isEs
              ? "Nuevos type filters: Translation y Summarization, con prompts optimizados, formatos de salida y restricciones específicas para cada caso."
              : "New type filters: Translation and Summarization, with optimized prompts, output formats, and constraints tailored to each use case."}
          </li>
          <li>
            {isEs
              ? "Builder mejorado: la versión del prompt optimizado ahora se controla por ENV, y la estructura de salida fue personalizada en mayor profundidad según purpose + task type + IA elegida."
              : "Improved builder: optimized prompt version is now controlled via ENV, and output structure is more deeply tailored by purpose + task type + selected AI."}
          </li>
          <li>
            {isEs
              ? "Soporte inicial para adjuntos textuales/contextuales en prompts compatibles: .txt, .md, .json, .csv, logs y archivos de código, usados como contexto real dentro del análisis."
              : "Initial support for text/context attachments in compatible prompts: .txt, .md, .json, .csv, logs, and code files, used as real context in the analysis flow."}
          </li>
          <li>
            {isEs
              ? "Nuevo bloque de ATTACHED CONTEXT / CONTEXTO ADJUNTO en el prompt optimizado, con tratamiento explícito de los archivos como contexto y no como instrucciones."
              : "New ATTACHED CONTEXT / CONTEXTO ADJUNTO block in the optimized prompt, explicitly treating files as context rather than instructions."}
          </li>
          <li>
            {isEs
              ? "Mejoras de seguridad para adjuntos: validación estricta de tipos y tamaños, sanitización de contenido y rechazo backend para prompt types no compatibles."
              : "Security improvements for attachments: strict validation of file types and sizes, content sanitization, and backend rejection for unsupported prompt types."}
          </li>
          <li>
            {isEs
              ? "Corrección de falsos positivos del motor: ya no debería marcar prompt injection por el scaffold propio de Promptea ni perder el contexto al reanalizar prompts optimizados con archivos embebidos."
              : "Engine false positives fixed: it should no longer flag prompt injection because of Promptea’s own scaffold or lose context when re-analyzing optimized prompts with embedded files."}
          </li>
          <li>
            {isEs
              ? "Findings y recomendaciones más específicos para resumen y traducción: en lugar de diagnósticos genéricos, ahora detecta mejor faltantes como foco, largo del resumen, idioma destino o registro."
              : "More specific findings and recommendations for summarization and translation: instead of generic diagnostics, it now better detects missing focus, summary length, target language, or register."}
          </li>
          <li>
            {isEs
              ? "Telemetría ampliada: además del análisis base, ahora se guarda metadata del formato de adjuntos subidos (kind/ext/mime) para entender mejor el uso del producto."
              : "Expanded telemetry: beyond base analysis, the system now stores uploaded attachment format metadata (kind/ext/mime) for better product usage insights."}
          </li>
          <li>
            {isEs
              ? "Cobertura de tests ampliada para builder, engine, route y flujo de adjuntos, incluyendo persistencia de metadata en telemetry."
              : "Expanded test coverage for builder, engine, route, and attachment flows, including telemetry metadata persistence."}
          </li>
        </ul>
      </div>

      {/* v1.0.3 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.0.3</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 08-02-2026" : "Released: 2026-02-08"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Mejoras SEO/Indexación: reducción de URLs de ruido y consolidación de rutas canónicas para evitar duplicados."
              : "SEO/Indexing improvements: reduced URL noise and consolidated canonical routes to avoid duplicates."}
          </li>
          <li>
            {isEs
              ? "Hubs optimizados (Guides/Models/Glossary): más contenido editorial + enlaces internos para mejorar rastreo e indexación."
              : "Optimized hubs (Guides/Models/Glossary): added editorial content + internal links to improve crawl and indexing."}
          </li>
          <li>
            {isEs
              ? "Tracking de campañas: integración de etiquetas de medición (Google/Ads) para registrar conversiones de uso sin exponer contenido sensible."
              : "Campaign tracking: added measurement tags (Google/Ads) to record usage conversions without exposing sensitive content."}
          </li>
        </ul>
      </div>

      {/* v1.0.2 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.0.2</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 03-02-2026" : "Released: 2026-02-03"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Nuevos packs SEO: Text y Data/JSON (plantillas copy-paste + deep links que precargan Promptea)."
              : "New SEO packs: Text and Data/JSON (copy-paste templates + deep links that prefill Promptea)."}
          </li>
          <li>
            {isEs
              ? "Nuevas secciones indexables: Guides, Models y Glossary (con páginas por slug y FAQ JSON-LD)."
              : "New indexable sections: Guides, Models and Glossary (with per-slug pages and FAQ JSON-LD)."}
          </li>
          <li>
            {isEs
              ? "Sitemap actualizado para incluir /prompts (incl. text/data), /guides, /models y /glossary + slugs."
              : "Sitemap updated to include /prompts (incl. text/data), /guides, /models and /glossary + slugs."}
          </li>
          <li>
            {isEs
              ? "Prompts index actualizado para incluir los nuevos packs (Text y Data)."
              : "Prompts index updated to include the new packs (Text and Data)."}
          </li>
          <li>
            {isEs
              ? "Footer reorganizado: links principales arriba y “Recursos útiles” en una línea separada (Prompts/Guides/Models/Glossary)."
              : "Footer reorganized: primary links on top and “Useful resources” on a separate line (Prompts/Guides/Models/Glossary)."}
          </li>
          <li>
            {isEs
              ? "UI: estilo de pills ajustado (hover y seleccionada) a fondo transparente + borde/texto blanco."
              : "UI: pill styling updated (hover + selected) to transparent background + white border/text."}
          </li>
          <li>{isEs ? "Fix: análisis de prompts Data/JSON que devolvían error." : "Fix: analyzing Data/JSON prompts that were returning an error."}</li>
        </ul>
      </div>

      {/* v1.0.1 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.0.1</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 30-01-2026" : "Released: 2026-01-30"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Packs de prompts con páginas SEO-friendly (Study, Code, Marketing, Image) + deep links que precargan Promptea."
              : "SEO-friendly prompt packs (Study, Code, Marketing, Image) + deep links that prefill Promptea."}
          </li>
          <li>
            {isEs
              ? "FAQ en cada pack + Schema.org JSON-LD (FAQPage) para mejorar CTR en buscadores."
              : "FAQ per pack + Schema.org JSON-LD (FAQPage) to improve search CTR."}
          </li>
          <li>{isEs ? "Mejoras de UX para navegación e iteración (acceso rápido a plantillas)." : "UX improvements for navigation and faster iteration (quick access to templates)."}</li>
          <li>{isEs ? "Footer actualizado con acceso a X + tooltip." : "Footer updated with X link + tooltip."}</li>
        </ul>
      </div>

      {/* v1.0.0 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.0.0</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 27-01-2026" : "Released: 2026-01-27"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>{isEs ? "Motor modularizado + tests de idempotencia." : "Modular engine + idempotency tests."}</li>
          <li>
            {isEs
              ? "Capa de lint con IDs estables (findings/recommendations) + detección de formato de salida."
              : "Lint layer with stable IDs + output format detection."}
          </li>
          <li>
            {isEs ? "Dataset de calibración ES/EN para validar comportamiento del motor." : "ES/EN calibration dataset to validate engine behavior."}
          </li>
          <li>
            {isEs ? "UI con headline/bullets basados en scoreExplain + badge de confianza." : "UI headline/bullets powered by scoreExplain + confidence badge."}
          </li>
          <li>{isEs ? "Telemetría en Firestore con TTL + feedback del usuario." : "Firestore telemetry with TTL + user feedback."}</li>
        </ul>
      </div>
    </main>
  );
}




