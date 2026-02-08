// app/[lang]/changelog/page.tsx
import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";

export default async function ChangelogPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const isEs = lang === "es";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Changelog</h1>

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
          <li>
            {isEs ? "Fix: análisis de prompts Data/JSON que devolvían error." : "Fix: analyzing Data/JSON prompts that were returning an error."}
          </li>
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
          <li>
            {isEs ? "Mejoras de UX para navegación e iteración (acceso rápido a plantillas)." : "UX improvements for navigation and faster iteration (quick access to templates)."}
          </li>
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




