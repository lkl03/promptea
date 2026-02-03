// app/[lang]/prompts/data/page.tsx
import Link from "next/link";
import { hasLocale } from "../../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

function buildOpenLink(lang: "es" | "en", purpose: string, target: string, prompt: string) {
  const qp = new URLSearchParams();
  qp.set("purpose", purpose);
  qp.set("target", target);
  qp.set("prompt", prompt);
  return `/${lang}?${qp.toString()}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "en" ? "en" : "es";

  return {
    title: l === "es" ? "Prompts de datos (plantillas)" : "Data prompts (templates)",
    description:
      l === "es"
        ? "Plantillas para extraer datos, devolver JSON, validar esquemas y transformar textos/CSV. Abrilas en Promptea y optimizalas por IA."
        : "Templates to extract data, return JSON, validate schemas and transform text/CSV. Open in Promptea and optimize with AI.",
    alternates: {
      canonical: `/${l}/prompts/data`,
      languages: {
        es: "/es/prompts/data",
        en: "/en/prompts/data",
      },
    },
  };
}

export default async function DataPromptPackPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const title = l === "es" ? "Prompts de datos" : "Data prompts";
  const subtitle =
    l === "es"
      ? "Plantillas listas para copiar. Elegí un ejemplo y abrilo en Promptea."
      : "Copy-ready templates. Pick one and open it in Promptea.";

  const examples = [
    {
      title: l === "es" ? "Extractor estricto a JSON (sin inventar)" : "Strict JSON extractor (no fabrication)",
      target: "gpt",
      purpose: "data",
      prompt:
        l === "es"
          ? `Actuá como parser estricto.

Texto fuente:
[pegá acá]

Esquema esperado (JSON Schema o Zod):
[pegá acá]

Reglas:
- NO inventes valores.
- Si un campo no está, devolvé null y agregá un warning.
- Devolvé SOLO JSON válido (sin backticks).

Salida:
{
  "data": <objeto conforme a esquema>,
  "warnings": [<strings>]
}`
          : `Act as a strict parser.

Source text:
[paste here]

Expected schema (JSON Schema or Zod):
[paste here]

Rules:
- Do NOT fabricate values.
- If a field is missing, return null and add a warning.
- Return ONLY valid JSON (no backticks).

Output:
{
  "data": <object matching schema>,
  "warnings": [<strings>]
}`,
    },
    {
      title: l === "es" ? "Normalizar datos (nombres, fechas, unidades)" : "Normalize data (names, dates, units)",
      target: "claude",
      purpose: "data",
      prompt:
        l === "es"
          ? `Dataset (tabla o JSON):
[pegá acá]

Objetivo: normalizar para análisis.
Reglas:
- fechas a ISO-8601 (YYYY-MM-DD) si es posible; si no, null + warning
- unidades: convertí a [unidad estándar] (indicar supuestos)
- strings: trim + case consistente
- deduplicación: criterio explícito
Devolvé:
1) datos normalizados
2) lista de supuestos
3) warnings de ambigüedad`
          : `Dataset (table or JSON):
[paste here]

Goal: normalize for analysis.
Rules:
- dates to ISO-8601 (YYYY-MM-DD) when possible; otherwise null + warning
- units: convert to [standard unit] (state assumptions)
- strings: trim + consistent casing
- deduplication: explicit criteria
Return:
1) normalized data
2) list of assumptions
3) ambiguity warnings`,
    },
    {
      title: l === "es" ? "Transformar CSV (mapeo a nuevo esquema)" : "Transform CSV (map to new schema)",
      target: "gemini",
      purpose: "data",
      prompt:
        l === "es"
          ? `CSV de entrada:
[pegá acá]

Quiero mapearlo al siguiente esquema destino:
[describí columnas destino + tipos + reglas]

Hacé:
- definí un plan de mapeo (col A -> col B)
- listá reglas de limpieza por campo
- detectá columnas faltantes y pedime lo mínimo
- devolvé el CSV transformado (con encabezados nuevos)
Si algo es ambiguo: null + warning.`
          : `Input CSV:
[paste here]

I want to map it to this target schema:
[describe target columns + types + rules]

Do:
- define a mapping plan (col A -> col B)
- list cleaning rules per field
- detect missing columns and ask only what's necessary
- return the transformed CSV (with new headers)
If ambiguous: null + warning.`,
    },
    {
      title: l === "es" ? "SQL a partir de requerimiento (con supuestos)" : "SQL from requirements (with assumptions)",
      target: "deepseek",
      purpose: "data",
      prompt:
        l === "es"
          ? `Actuá como analista de datos.

Requerimiento:
[qué quiero medir]

Esquema de tablas:
[pegá tablas + columnas]

Entregá:
1) SQL (con comentarios)
2) supuestos (si falta info)
3) tests rápidos: 3 consultas para validar que no está roto
Regla: si el requerimiento es ambiguo, preguntá hasta 3 aclaraciones antes de escribir el SQL final.`
          : `Act as a data analyst.

Requirement:
[what I want to measure]

Tables schema:
[paste tables + columns]

Deliver:
1) SQL (with comments)
2) assumptions (if info is missing)
3) quick tests: 3 queries to validate it’s not broken
Rule: if ambiguous, ask up to 3 clarifying questions before writing the final SQL.`,
    },
    {
      title: l === "es" ? "Validación de JSON contra reglas (QA)" : "Validate JSON against rules (QA)",
      target: "grok",
      purpose: "data",
      prompt:
        l === "es"
          ? `JSON:
[pegá acá]

Reglas de negocio:
[pegá acá]

Tarea:
- verificá cada regla y marcá PASS/FAIL
- para cada FAIL: path exacto (ej: data.items[2].price) + por qué
- proponé corrección mínima (patch)
Salida en Markdown con tabla de resultados + patch JSON (RFC 6902 si aplica).`
          : `JSON:
[paste here]

Business rules:
[paste here]

Task:
- check each rule and mark PASS/FAIL
- for each FAIL: exact path (e.g., data.items[2].price) + why
- propose minimal fix (patch)
Output in Markdown with a results table + JSON patch (RFC 6902 if applicable).`,
    },
    {
      title: l === "es" ? "Extraer entidades (NLP liviano) a tabla" : "Extract entities to a table (light NLP)",
      target: "gpt",
      purpose: "data",
      prompt:
        l === "es"
          ? `Texto:
[pegá acá]

Extraé entidades a una tabla con columnas:
- entity_type (persona/empresa/producto/fecha/monto/lugar/otro)
- value
- confidence (0-1)
- evidence (frase exacta)

Reglas:
- evidence debe ser cita literal del texto
- si dudás, confidence < 0.6
Devolvé CSV con encabezados.`
          : `Text:
[paste here]

Extract entities into a table with columns:
- entity_type (person/company/product/date/amount/location/other)
- value
- confidence (0-1)
- evidence (exact quote)

Rules:
- evidence must be a literal quote from the text
- if unsure, confidence < 0.6
Return CSV with headers.`,
    },
  ];

  const faq = [
    {
      q: l === "es" ? "¿Cómo uso estas plantillas?" : "How do I use these templates?",
      a:
        l === "es"
          ? "Elegí un ejemplo y tocá “Abrir en Promptea”. Te precarga el prompt, el objetivo (Data) y el modelo sugerido."
          : "Pick an example and click “Open in Promptea”. It pre-fills the prompt, purpose (Data), and a suggested model.",
    },
    {
      q: l === "es" ? "¿Por qué importa elegir 'Data'?" : "Why does selecting 'Data' matter?",
      a:
        l === "es"
          ? "Porque Promptea prioriza estructura y verificabilidad: esquema, nulls cuando falta info, warnings y paths exactos."
          : "Because Promptea prioritizes structure and verifiability: schema, nulls for missing info, warnings, and exact paths.",
    },
    {
      q: l === "es" ? "¿Cómo reduzco alucinaciones?" : "How do I reduce hallucinations?",
      a:
        l === "es"
          ? "Forzá reglas de “no inventar” + nulls + warnings, y pedí evidencia literal o paths exactos para campos críticos."
          : "Enforce “no fabrication” + nulls + warnings, and ask for literal evidence or exact paths for critical fields.",
    },
    {
      q: l === "es" ? "¿Qué pasa con mis datos?" : "What happens to my data?",
      a:
        l === "es"
          ? "Promptea evita enviar el texto del prompt en telemetría. El objetivo es medir uso y calidad sin guardar contenido sensible."
          : "Promptea avoids sending the prompt text in telemetry. The goal is measuring usage and quality without storing sensitive content.",
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((x) => ({
      "@type": "Question",
      name: x.q,
      acceptedAnswer: { "@type": "Answer", text: x.a },
    })),
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      {/* JSON-LD FAQ */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{title}</h1>
        <p className="opacity-80 text-sm sm:text-base">{subtitle}</p>

        <div className="pt-2 text-xs opacity-70">
          <Link href={`/${l}/prompts`} className="hover:underline underline-offset-2">
            {l === "es" ? "← Ver todos los packs" : "← View all packs"}
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {examples.map((ex) => {
          const href = buildOpenLink(l, ex.purpose, ex.target, ex.prompt);
          return (
            <div key={ex.title} className="surface p-4 space-y-3">
              <div className="text-sm font-medium">{ex.title}</div>
              <pre className="surface-soft p-3 text-xs whitespace-pre-wrap max-h-56 overflow-auto">{ex.prompt}</pre>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs opacity-70">
                  {l === "es" ? "Se abre en la home con el prompt precargado." : "Opens on home with the prompt prefilled."}
                </div>
                <Link href={href} className="btn btn-primary h-9 px-4">
                  {l === "es" ? "Abrir en Promptea" : "Open in Promptea"}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ visible */}
      <section className="mt-10 surface p-5">
        <div className="text-sm font-medium">{l === "es" ? "Preguntas frecuentes" : "FAQ"}</div>
        <div className="mt-3 space-y-2">
          {faq.map((x) => (
            <details key={x.q} className="surface-soft p-3 rounded-2xl">
              <summary className="cursor-pointer text-sm font-medium">{x.q}</summary>
              <div className="mt-2 text-sm opacity-80">{x.a}</div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
