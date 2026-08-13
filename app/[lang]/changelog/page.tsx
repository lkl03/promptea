import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "en" ? "en" : "es";
  return {
    title: l === "es" ? "Historial de versiones" : "Changelog",
    description:
      l === "es"
        ? "Historial completo de versiones de Promptea: nuevas guías SEO, mejoras del analizador de prompts y correcciones de producto."
        : "Full version history for Promptea: new SEO guides, prompt analyzer improvements, and product fixes.",
    alternates: {
      canonical: `/${l}/changelog`,
      languages: { es: "/es/changelog", en: "/en/changelog" },
    },
  };
}

export default async function ChangelogPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const isEs = lang === "es";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Changelog</h1>

      {/* v1.4.3 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.4.3</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 13-08-2026" : "Released: 2026-08-13"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Nueva guía: Prompts para Perplexity — cuándo elegirlo sobre un modelo estático, cómo restringir tipos de fuentes, patrones para investigación del estado actual y comparaciones competitivas con datos en tiempo real."
              : "New guide: Prompts for Perplexity — when to choose it over a static model, how to constrain source types, patterns for current-state research, and competitive comparisons with live data."}
          </li>
          <li>
            {isEs
              ? "Nueva guía: Cómo depurar un prompt que da resultados malos — los seis modos de falla más comunes, un proceso de depuración de cinco pasos, y plantillas para auto-diagnóstico y comparación de outputs."
              : "New guide: How to debug a prompt that gives bad output — the six most common failure modes, a five-step debugging process, and templates for prompt self-diagnosis and output comparison."}
          </li>
          <li>
            {isEs
              ? "Nueva guía: Prompts de IA para product managers — dónde la IA ahorra más tiempo (specs, síntesis, priorización, comunicación con stakeholders), cómo obtener output estructurado confiable, y plantillas para PRD simplificado y síntesis de entrevistas."
              : "New guide: AI prompts for product managers — where AI saves the most time (specs, synthesis, prioritization, stakeholder communication), how to get reliable structured output, and templates for lean PRD drafts and user-interview synthesis."}
          </li>
          <li>
            {isEs
              ? "El panel de resultados ahora tiene el botón de copiar en ambas pestañas — la vista del prompt original ya tiene su propio botón de copiar, igual que la vista del prompt mejorado."
              : "The result panel now has a copy button on both tabs — the original-prompt view now has its own copy button, symmetric with the improved-prompt view."}
          </li>
        </ul>
      </div>

      {/* v1.4.2 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.4.2</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 08-08-2026" : "Released: 2026-08-08"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "AI Daily ahora se abre con un buscador grande y a la vista, igual al de la página principal: entrás, escribís y listo, sin tener que pasar por un panel de opciones."
              : "AI Daily now opens with one big, obvious search box, the same one you use on the homepage: you arrive, you type, done — no panel of options to get past first."}
          </li>
          <li>
            {isEs
              ? "Los filtros por empresa, edición, categoría y fechas siguen estando y funcionan igual que antes, pero ahora quedan guardados en un control chiquito, sin ocupar la parte de arriba de la página."
              : "The filters by company, edition, category, and date are all still there and work exactly as before — they just tuck into a small control now instead of taking over the top of the page."}
          </li>
          <li>
            {isEs
              ? "La lista de notas se rediseñó en una sola columna, más ancha y más aireada: se lee de corrido, como un blog, y no como una grilla apretada."
              : "The article list was redesigned as a single, wider, airier column: it reads straight down like a blog instead of as a tight grid."}
          </li>
          <li>
            {isEs
              ? "Por ahora el índice muestra simplemente las notas más recientes primero. La nota “destacada” vuelve cuando el archivo sea lo bastante grande como para que destacar una signifique algo."
              : "For now the index simply shows the most recent stories first. The “featured” story comes back once the archive is big enough for singling one out to actually mean something."}
          </li>
        </ul>
      </div>

      {/* v1.4.1 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.4.1</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 08-08-2026" : "Released: 2026-08-08"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Ahora podés buscar en el archivo de AI Daily: escribís y busca en títulos, bajadas y etiquetas de todas las notas publicadas."
              : "You can now search the AI Daily archive: type and it looks across the headlines, decks, and tags of every published story."}
          </li>
          <li>
            {isEs
              ? "Filtros por empresa, tipo de edición, categoría y rango de fechas, más orden de más nuevo a más viejo o al revés. Cada combinación tiene su propia dirección web, así que la podés compartir o guardar en favoritos y funciona incluso sin JavaScript."
              : "Filters by company, edition type, category, and date range, plus newest-first or oldest-first sorting. Every combination has its own web address, so you can share it or bookmark it — and it works even with JavaScript off."}
          </li>
          <li>
            {isEs
              ? "Dos ediciones nuevas además de la nota diaria: los sábados, “la semana en resumen”, y los domingos, “qué mirar la semana que viene”. Cada una dice qué período cubre, y un sábado puede tener el resumen y además una noticia fuerte del día."
              : "Two new editions alongside the daily story: a Saturday “week in review” and a Sunday “what to watch next week”. Each one states the period it covers, and a Saturday can carry both the recap and a big story that broke that day."}
          </li>
          <li>
            {isEs
              ? "Notas sobre hechos de días anteriores, cuando las hay, salen claramente etiquetadas: se muestra la fecha del hecho, la fecha de publicación y el motivo por el que se publicó más tarde. Como máximo se puede volver 14 días atrás, y la rutina automática sigue publicando solo lo del día."
              : "When a story covers an earlier event, it says so plainly: you see the event date, the publication date, and the stated reason it ran late. It can only reach 14 days back, and the automated routine still publishes same-day news only."}
          </li>
          <li>
            {isEs
              ? "AI Daily pasó a estar más arriba en el menú, justo después de Elegir la mejor IA, y la página principal ahora presenta la sección."
              : "AI Daily moved up in the menu, right after Find the Best AI, and the homepage now introduces the section."}
          </li>
        </ul>
      </div>

      {/* v1.4.0 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.4.0</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 08-08-2026" : "Released: 2026-08-08"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Nueva sección AI Daily (/blog): una nota por día sobre lo que pasó en IA, en español y en inglés, con índice propio y feed RSS por idioma."
              : "New AI Daily section (/blog): one story a day about what happened in AI, in Spanish and English, with its own index and an RSS feed per language."}
          </li>
          <li>
            {isEs
              ? "Cada nota muestra de dónde salió: fuentes con enlace, cuál es primaria y cuál secundaria, un bloque de “por qué importa”, los puntos clave y el tiempo estimado de lectura."
              : "Every article shows where it came from: linked sources marked primary or secondary, a “why this matters” block, key takeaways, and estimated reading time."}
          </li>
          <li>
            {isEs
              ? "Regla del mismo día: solo se publica si el hecho ocurrió ese mismo día (hora de Buenos Aires). Si no hay nada verificable, no sale nada — preferimos un día vacío antes que una nota recalentada."
              : "Same-day rule: a story only goes out if the event happened that same day (Buenos Aires time). If nothing verifiable happened, nothing is published — an empty day beats a warmed-over story."}
          </li>
          <li>
            {isEs
              ? "Correcciones visibles: si una nota se corrige después de publicarse, la corrección queda anotada en la nota con su fecha. No se edita en silencio."
              : "Visible corrections: if an article is corrected after publication, the correction is recorded on the article with its date. Nothing is edited silently."}
          </li>
          <li>
            {isEs
              ? "Publicación automática y segura: la rutina que arma la nota diaria publica por un canal firmado y con permisos mínimos, no puede publicar dos veces la misma nota, y deja registro de cada intento."
              : "Secure automated publishing: the routine that assembles the daily story publishes through a signed, least-privilege channel, cannot publish the same story twice, and logs every attempt."}
          </li>
          <li>
            {isEs
              ? "Historial de versiones al día otra vez: esta página se había quedado una versión atrás, así que recuperamos la ficha de v1.3.2 que faltaba."
              : "Version history back in sync: this page had fallen one release behind, so the missing v1.3.2 entry was restored."}
          </li>
        </ul>
      </div>

      {/* v1.3.2 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.3.2</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 06-08-2026" : "Released: 2026-08-06"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Nueva guía: Prompts para Kimi — cómo aprovechar su ventana de contexto grande para Q&A sobre documentos largos, síntesis de investigación multi-fuente y anclaje preciso en el documento."
              : "New guide: Prompts for Kimi — how to use its large context window for long-document Q&A, multi-source research synthesis, and precise document anchoring."}
          </li>
          <li>
            {isEs
              ? "Nueva guía: Prompts de IA para análisis de datos — plantillas para generar SQL, identificar tendencias e interpretar resultados, con schema explícito para evitar nombres de columna inventados."
              : "New guide: AI prompts for data analysis — templates for SQL generation, trend identification, and data interpretation, with explicit schema to avoid hallucinated column names."}
          </li>
          <li>
            {isEs
              ? "Nueva guía: Prompts de IA para aprender — cómo usar la IA como tutor calibrado a tu nivel, el test de Feynman para chequear que entendiste, y armado de planes de estudio."
              : "New guide: AI prompts for learning — how to use AI as a tutor calibrated to your level, the Feynman test to check comprehension, and building study plans."}
          </li>
          <li>
            {isEs
              ? "Fix de sitemap: cuatro rutas públicas (/best-ai, /prompts/code, /prompts/image y /prompts/marketing) faltaban en sitemap.xml y ahora están incluidas."
              : "Sitemap fix: four public routes (/best-ai, /prompts/code, /prompts/image, and /prompts/marketing) were missing from sitemap.xml and are now included."}
          </li>
        </ul>
      </div>

      {/* v1.3.1 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.3.1</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 04-08-2026" : "Released: 2026-08-04"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Historial de versiones puesto al día: esta página ahora documenta v1.2.1, v1.2.2, v1.2.3 y v1.3.0, que faltaban desde julio."
              : "Version history caught up: this page now documents v1.2.1, v1.2.2, v1.2.3, and v1.3.0, which were missing since July."}
          </li>
          <li>
            {isEs
              ? "El botón de dictado por voz ahora tiene un texto al lado que explica para qué sirve, en ambos modos."
              : "The voice dictation button now has a short explainer next to it describing what it does, in both modes."}
          </li>
          <li>
            {isEs
              ? "El botón “¿Nuevo? Mirá cómo funciona →” ahora también aparece en Elegir la mejor IA, con una explicación paso a paso propia de ese modo (señales detectadas, puntaje determinístico, alternativas y el pase al optimizador)."
              : "The “New? See how it works →” button now also appears on Find the Best AI, with its own step-by-step explanation of that mode (detected signals, deterministic scoring, alternatives, and the handoff to the optimizer)."}
          </li>
          <li>
            {isEs
              ? "Retoques de copy en el modal de ayuda del analizador: los pasos ahora mencionan el dictado por voz y el conteo de pasos quedó correcto."
              : "Copy touch-ups in the analyzer help modal: the steps now mention voice dictation and the step count reads correctly."}
          </li>
        </ul>
      </div>

      {/* v1.3.0 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.3.0</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 04-08-2026" : "Released: 2026-08-04"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Promptea ahora tiene dos modos con rutas propias: Mejorar prompt (el analizador de siempre, evolucionado) y Elegir la mejor IA, una experiencia nueva que te dice qué IA conviene para el prompt que ya tenés."
              : "Promptea now has two route-addressable modes: Improve Prompt (the analyzer you know, evolved) and Find the Best AI, a new experience that tells you which AI fits the prompt you already have."}
          </li>
          <li>
            {isEs
              ? "Elegir la mejor IA usa un matcher 100% determinístico: detecta señales concretas en tu prompt (rutas de repo, pedidos de fuentes, JSON estricto, imágenes, traducción…), puntúa cada IA según capacidades verificadas contra documentación oficial, distingue entornos como Claude Code del chat común, y muestra puntaje, confianza, empates honestos, hasta 3 alternativas con sus contras y consejos que citan lo que encontró en tu texto."
              : "Find the Best AI runs a 100% deterministic matcher: it detects concrete signals in your prompt (repo paths, source requests, strict JSON, images, translation…), scores each AI against capabilities verified from official docs, distinguishes environments like Claude Code from plain chat, and shows a score, confidence, honest ties, up to 3 alternatives with trade-offs, and advice that cites what it found in your text."}
          </li>
          <li>
            {isEs
              ? "Con un clic, “Mejorar mi prompt para esta IA” pasa tu prompt completo al optimizador con la IA, el modelo y el propósito recomendados ya preseleccionados — sin copiar y pegar."
              : "One click on “Improve my prompt for this AI” transfers your full prompt to the optimizer with the recommended AI, model, and purpose preselected — no copy-paste."}
          </li>
          <li>
            {isEs
              ? "El prompt optimizado ya no arranca con el encabezado PROMPTEA: la versión, el modelo y el propósito ahora viven en la metadata del resultado. Cada tipo de tarea recibe su propia forma: los mensajes cortos quedan naturales, las tareas de repo llevan objetivo y validación, los pedidos de datos llevan schema y reglas — y un prompt que ya está bien vuelve casi intacto."
              : "The optimized prompt no longer starts with the PROMPTEA header: version, model, and purpose now live in result metadata. Each task type gets its own shape: short messages stay natural, repo tasks get objective and validation sections, data requests get schema and rules — and an already-good prompt comes back nearly untouched."}
          </li>
          <li>
            {isEs
              ? "Dictado por voz en ambos modos: grabás (hasta 2 minutos), lo transcribimos con Whisper vía Groq, y SIEMPRE revisás y editás el texto antes de usarlo. El audio nunca se guarda."
              : "Voice dictation in both modes: record (up to 2 minutes), we transcribe it with Whisper via Groq, and you ALWAYS review and edit the text before using it. Audio is never stored."}
          </li>
          <li>
            {isEs
              ? "Nuevos temas: Aqua (claro, estilo vidrio líquido con acentos Apple) y Metro (oscuro, fiel al Metro de Windows 8: azulejos planos, azure #0078D7, tipografía Segoe). El tema “Versión anterior” conserva el look previo para quien lo prefiera. La preferencia del sistema mapea a Aqua/Metro y los temas guardados viejos migran solos."
              : "New themes: Aqua (light, liquid-glass style with Apple accents) and Metro (dark, faithful to Windows 8 Metro: flat tiles, azure #0078D7, Segoe type). The “Old version” theme keeps the previous look for anyone who prefers it. System preference maps to Aqua/Metro and legacy saved themes migrate automatically."}
          </li>
          <li>
            {isEs
              ? "El feedback general ahora se envía desde un modal y se guarda de forma segura (sin tu prompt, sin email, sin identificadores crudos) en lugar de abrir tu cliente de correo. El feedback de utilidad del análisis sigue funcionando igual."
              : "General feedback is now sent from a modal and stored safely (without your prompt, email, or raw identifiers) instead of opening your email client. Analysis helpfulness feedback keeps working as before."}
          </li>
          <li>
            {isEs
              ? "Página de privacidad actualizada (voz y feedback), telemetría solo operativa y tipificada, y la suite de tests creció de 159 a 249 casos en 22 archivos."
              : "Updated privacy page (voice and feedback), typed operational-only telemetry, and the test suite grew from 159 to 249 cases across 22 files."}
          </li>
        </ul>
      </div>

      {/* v1.2.3 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.2.3</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 30-07-2026" : "Released: 2026-07-30"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Nueva guía: Zero-shot prompting — cuándo funciona sin ejemplos y cuándo conviene pasar a few-shot, cómo arreglar resultados inconsistentes y las restricciones que hacen confiable un prompt de solo instrucciones."
              : "New guide: Zero-shot prompting — when instruction-only prompts work and when to switch to few-shot, how to fix inconsistent results, and the constraints that make them reliable."}
          </li>
          <li>
            {isEs
              ? "Nueva guía: Prompts para GPT — plantillas con formato etiquetado, bloques de restricciones, ubicación de instrucciones en documentos largos y pedidos de auto-verificación."
              : "New guide: Prompts for GPT — labeled format templates, constraint block patterns, instruction placement for long documents, and self-verification requests."}
          </li>
          <li>
            {isEs
              ? "Nueva guía: Prompts de brainstorming con IA — técnicas para salir de las ideas genéricas: prohibir lo obvio, ángulos de diversidad forzada, combinaciones entre dominios y separar generación de evaluación."
              : "New guide: AI brainstorming prompts — techniques to escape generic ideas: banning the obvious, forced diversity angles, cross-domain combinations, and separating generation from evaluation."}
          </li>
          <li>
            {isEs
              ? "Fix de localización: el encabezado “Templates” en las páginas de guías ahora dice “Plantillas” en español."
              : "Localization fix: the “Templates” section heading on guide pages now correctly reads “Plantillas” in Spanish."}
          </li>
        </ul>
      </div>

      {/* v1.2.2 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.2.2</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 23-07-2026" : "Released: 2026-07-23"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Nueva guía: Prompt chaining — cómo dividir tareas complejas en pasos secuenciales de IA, los tres patrones de encadenado (secuencial, con ramas, con loops) y sus modos de falla más comunes."
              : "New guide: Prompt chaining — how to break complex tasks into sequential AI steps, the three chaining patterns (sequential, branching, looping), and their most common failure modes."}
          </li>
          <li>
            {isEs
              ? "Nueva guía: Prompts de escritura con IA — los cinco elementos que un prompt de escritura necesita además del tema (audiencia, tono, formato, largo y lista de cosas a evitar) y técnicas de control de voz."
              : "New guide: AI writing prompts — the five elements a writing prompt needs beyond the topic (audience, tone, format, length, avoidance list) and voice-control techniques."}
          </li>
          <li>
            {isEs
              ? "Nueva guía: Prompts multimodales — cómo escribir prompts cuando el input incluye imágenes, capturas o PDFs, con anclas espaciales y restricciones de formato de salida."
              : "New guide: Multimodal prompts — how to write prompts when the input includes images, screenshots, or PDFs, with spatial anchors and output format constraints."}
          </li>
          <li>
            {isEs
              ? "Las páginas de cada guía ahora emiten metadata Open Graph y Twitter Card propia, para mejores previews al compartir."
              : "Guide detail pages now emit page-specific Open Graph and Twitter Card metadata for better share previews."}
          </li>
        </ul>
      </div>

      {/* v1.2.1 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.2.1</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 16-07-2026" : "Released: 2026-07-16"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Nueva guía: System prompts — cómo escribir instrucciones persistentes para ChatGPT, Claude y Gemini que moldean todas las respuestas sin repetirte: persona, alcance, formatos por defecto y reglas de escalado."
              : "New guide: System prompts — how to write persistent instructions for ChatGPT, Claude, and Gemini that shape every response without repeating yourself: persona, scope, format defaults, and escalation rules."}
          </li>
          <li>
            {isEs
              ? "Nueva guía: Prompts de traducción con IA — plantillas que preservan sentido, tono y registro, con glosarios por dominio, preservación de formato y control del largo."
              : "New guide: AI translation prompts — templates that preserve meaning, tone, and register, with domain glossaries, format preservation, and length drift prevention."}
          </li>
          <li>
            {isEs
              ? "Nueva guía: Prompts de generación de imágenes — sujeto, estilo, composición, iluminación, paleta y restricciones negativas para resultados consistentes en DALL-E, Imagen y similares."
              : "New guide: Image generation prompts — subject, style, composition, lighting, palette, and negative constraints for consistent results in DALL-E, Imagen, and similar models."}
          </li>
          <li>
            {isEs
              ? "Las páginas de guías ahora emiten BreadcrumbList JSON-LD junto al FAQPage existente, habilitando migas de pan en los resultados de Google."
              : "Guide pages now emit BreadcrumbList JSON-LD alongside the existing FAQPage block, enabling breadcrumb paths in Google search results."}
          </li>
        </ul>
      </div>

      {/* v1.2.0 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.2.0</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 12-07-2026" : "Released: 2026-07-12"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Rediseño completo: nueva tipografía, cuatro temas (Día, Atardecer, Noche y Papel) con tokens semánticos y contraste AA, fondo ambiental calmo y bloques de prompt en fuente mono."
              : "Full redesign: new typography, four themes (Day, Dusk, Night, and Paper) built on semantic tokens with AA contrast, a calm ambient background, and monospace prompt blocks."}
          </li>
          <li>
            {isEs
              ? "Nuevo motor de refinamiento adaptativo: enruta cada prompt a una estrategia (mensaje corto, código, JSON estricto, tarea de agente, etc.), protege literales como URLs y rutas, valida el resultado con un quality gate y siempre cae al motor determinístico si algo falla."
              : "New adaptive refinement engine: routes each prompt to a strategy (short message, coding, strict JSON, agent task, etc.), protects literals like URLs and file paths, validates output through a quality gate, and always falls back to the deterministic engine on failure."}
          </li>
          <li>
            {isEs
              ? "Los prompts simples ya no reciben el andamiaje completo de secciones: la reescritura se adapta a la complejidad real del pedido."
              : "Simple prompts no longer receive the full section scaffold: the rewrite adapts to the request's real complexity."}
          </li>
          <li>
            {isEs
              ? "Comparación Mejorado/Original en el resultado, con resumen de qué cambió, supuestos y preguntas pendientes cuando corre el refinador con IA."
              : "Improved/Original comparison on the result, with a summary of what changed, assumptions, and open questions when the AI refiner ran."}
          </li>
          <li>
            {isEs
              ? "Catálogo de modelos verificado contra documentación oficial (12-07-2026): GPT-5.6, Claude Fable 5 / Opus 4.8 / Sonnet 5 / Haiku 4.5, Gemini 3.5 Flash y 3.1 Pro, Grok 4.5, DeepSeek V4, Kimi K2.6 y la familia Sonar. Los alias viejos quedan marcados como legacy."
              : "Model catalog verified against official docs (2026-07-12): GPT-5.6, Claude Fable 5 / Opus 4.8 / Sonnet 5 / Haiku 4.5, Gemini 3.5 Flash and 3.1 Pro, Grok 4.5, DeepSeek V4, Kimi K2.6, and the Sonar family. Old aliases are now marked legacy."}
          </li>
          <li>
            {isEs
              ? "Corrección del scoring: los prompts bien formados ya no quedaban subvalorados por bugs de detección; los 14 casos de calibración que fallaban ahora pasan."
              : "Scoring fix: well-formed prompts were being under-rated by detection bugs; the 14 failing calibration cases now pass."}
          </li>
          <li>
            {isEs
              ? "Accesibilidad: navegación completa por teclado, anuncios para lectores de pantalla, y respeto de prefers-reduced-motion."
              : "Accessibility: full keyboard navigation, screen-reader announcements, and prefers-reduced-motion support."}
          </li>
        </ul>
      </div>

      {/* v1.1.6 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.1.6</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 09-07-2026" : "Released: 2026-07-09"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Nueva guía: Prompts para DeepSeek — código con restricciones estrictas, extracción de JSON, y razonamiento analítico paso a paso."
              : "New guide: Prompts for DeepSeek — code with strict constraints, JSON extraction, and step-by-step analytical reasoning."}
          </li>
          <li>
            {isEs
              ? "Nueva guía: Few-shot prompting — cómo mostrar ejemplos en vez de solo explicar, con templates de clasificación de texto y reescritura de estilo."
              : "New guide: Few-shot prompting — how to show examples instead of just explaining, with text classification and style rewriting templates."}
          </li>
          <li>
            {isEs
              ? "Nueva guía: Scoring de calidad de prompts — framework de autoevaluación en cinco dimensiones con templates de revisión y debug rápido."
              : "New guide: Prompt quality scoring — five-dimension self-evaluation framework with review and rapid debug templates."}
          </li>
          <li>
            {isEs
              ? "Mejora: la página de Changelog ahora incluye metadata SEO propia (título, descripción, canonical) en lugar de heredar el título genérico de la app."
              : "Improvement: the Changelog page now has its own SEO metadata (title, description, canonical) instead of inheriting the generic app title."}
          </li>
          <li>
            {isEs
              ? "Versión del prompt optimizado actualizada a v1.1.6 (PROMPTEA: v1.1.6)."
              : "Optimized prompt version updated to v1.1.6 (PROMPTEA: v1.1.6)."}
          </li>
        </ul>
      </div>

      {/* v1.1.5 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.1.5</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 02-07-2026" : "Released: 2026-07-02"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Nueva guía: Prompts para Gemini — control de formato con plantillas visibles, Q&A con grounding y cómo evitar verbosidad."
              : "New guide: Prompts for Gemini — format control with visible templates, grounded Q&A, and how to prevent verbosity."}
          </li>
          <li>
            {isEs
              ? "Nueva guía: Prompts para Grok — cómo obtener respuestas directas, uso de contexto en tiempo real y comparaciones estructuradas rápidas."
              : "New guide: Prompts for Grok — how to get direct responses, using real-time context, and quick structured comparisons."}
          </li>
          <li>
            {isEs
              ? "Nueva guía: Templates de prompts de IA para negocios — reportes de estado de proyecto, memos de decisión con criterios y templates de soporte al cliente."
              : "New guide: AI prompt templates for business — project status reports, decision memos with criteria, and customer support templates."}
          </li>
          <li>
            {isEs
              ? "Mejora: la descripción SEO de la página índice de Guías actualizada para reflejar el catálogo completo actual."
              : "Improvement: Guides index page SEO description updated to reflect the full current guide catalog."}
          </li>
          <li>
            {isEs
              ? "Versión del prompt optimizado actualizada a v1.1.5 (PROMPTEA: v1.1.5)."
              : "Optimized prompt version updated to v1.1.5 (PROMPTEA: v1.1.5)."}
          </li>
        </ul>
      </div>

      {/* v1.1.4 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.1.4</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 24-06-2026" : "Released: 2026-06-24"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Nueva guía: Role prompting — cómo asignar personas de experto para mejores respuestas, con templates de asesor y revisor."
              : "New guide: Role prompting — how to assign expert personas for better outputs, with advisor and reviewer templates."}
          </li>
          <li>
            {isEs
              ? "Nueva guía: Prompts de ChatGPT para el trabajo — templates para email profesional y resumen ejecutivo, con restricciones de formato."
              : "New guide: ChatGPT prompts for work — professional email and executive summary templates with format constraints."}
          </li>
          <li>
            {isEs
              ? "Nueva guía: Prompts para Claude — XML tags, contexto extendido y razonamiento estructurado, con templates de Q&A con citas y análisis con perspectivas opuestas."
              : "New guide: Prompts for Claude — XML tags, extended context, and structured reasoning, with document Q&A and competing-viewpoints templates."}
          </li>
          <li>
            {isEs
              ? "Fix: el heading 'Start here' en la página índice de Guías ahora está localizado ('Por dónde empezar' en español)."
              : "Fix: the 'Start here' heading on the Guides index page is now properly localized in Spanish ('Por dónde empezar')."}
          </li>
          <li>
            {isEs
              ? "Versión del prompt optimizado actualizada a v1.1.4 (PROMPTEA: v1.1.4)."
              : "Optimized prompt version updated to v1.1.4 (PROMPTEA: v1.1.4)."}
          </li>
        </ul>
      </div>

      {/* v1.1.3 */}
      <div className="surface-soft p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-lg font-medium">v1.1.3</div>
          <div className="text-xs opacity-70">{isEs ? "Lanzado: 17-06-2026" : "Released: 2026-06-17"}</div>
        </div>

        <ul className="list-disc pl-5 text-sm opacity-90 space-y-1">
          <li>
            {isEs
              ? "Registro de modelos actualizado con los últimos modelos de OpenRouter: GPT-5.5 y GPT-5.5 Pro, Claude Fable 5 y Opus 4.8, Gemini 3.5 Flash, Grok 4.3 y Grok Build 0.1, DeepSeek V4 Pro y Flash."
              : "Model registry updated with the latest OpenRouter models: GPT-5.5 and GPT-5.5 Pro, Claude Fable 5 and Opus 4.8, Gemini 3.5 Flash, Grok 4.3 and Grok Build 0.1, DeepSeek V4 Pro and Flash."}
          </li>
          <li>
            {isEs
              ? "Nuevo proveedor Perplexity (Sonar Pro y Sonar Reasoning Pro): soporte completo como target con hints de motor, agrupación en UI y optimización de prompts orientada a búsqueda web en tiempo real."
              : "New Perplexity provider (Sonar Pro and Sonar Reasoning Pro): full target support with engine hints, UI grouping, and prompt optimization tailored for real-time web search."}
          </li>
          <li>
            {isEs
              ? "Capa adaptativa: el analizador refina el prompt optimizado con LLM."
              : "Adaptive layer: the analyzer refines the optimized prompt with LLM."}
          </li>
          <li>
            {isEs
              ? "Fix: el botón 'Probar este prompt' / 'Try this prompt' ya no puede resetear el estado del analizador cuando hay un resultado visible, un análisis en curso o archivos cargándose."
              : "Fix: the 'Probar este prompt' / 'Try this prompt' button can no longer reset analyzer state while a result is visible, an analysis is pending, or files are loading."}
          </li>
          <li>
            {isEs
              ? "El encabezado del prompt optimizado ahora indica v1.1.3 (PROMPTEA: v1.1.3)."
              : "The optimized prompt header now shows v1.1.3 (PROMPTEA: v1.1.3)."}
          </li>
        </ul>
      </div>

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




