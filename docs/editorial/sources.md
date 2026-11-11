# Registro de fuentes de AI Daily (IA y Tech)

El registro es código: [`lib/blog/sources.ts`](../../lib/blog/sources.ts). Este documento explica cómo está armado y cómo se mantiene. La versión para lectores es la página pública `/{lang}/sources`, que se genera desde el mismo registro.

- **140 fuentes**, todas verificadas con fetch el **2026-11-11**: [`sources-verification.md`](./sources-verification.md) (URL, estado HTTP, tipo de documento encontrado y cantidad de ítems de cada una).
- Nivel 1: 107 · Nivel 2: 24 · Nivel 3: 9.

## Niveles y reglas de uso

| Nivel | Qué es | Regla |
| --- | --- | --- |
| **1 — primarias** | Blogs, changelogs, notas de versión, documentación y repositorios oficiales; papers; organismos públicos. El responsable de la noticia, con sus palabras. | Toda nota necesita al menos una (lo exige el schema). Lo que un producto hace, cuesta o cambia se afirma como hecho solo si lo dice una de estas. Es primaria respecto de lo que dice su autor, no una prueba de que sea cierto: un anuncio se cuenta como anuncio y un preprint como preprint. |
| **2 — prensa técnica confiable** | Medios independientes con estándares editoriales, en inglés y en español. | Contexto, lo que la empresa no dijo y segunda fuente independiente. Nunca la única base de una afirmación. Lo que informan se les atribuye por su nombre. |
| **3 — solo descubrimiento** | Agregadores, listas de tendencias, comentarios de particulares. | Sirven para detectar una nota y llegar al original. **Nunca se citan.** Si el original no se puede leer, no hay nota. |

Reglas del propio registro (las controla `lib/__tests__/blog.sources.test.ts`): toda URL es `https`; ids únicos; ninguna fuente de nivel 1 es de tipo `reporting` y todas las de nivel 2 lo son; cada entrada declara tipo (`BLOG_SOURCE_TYPES`), idioma, temas y a qué edición sirve (`ai`, `tech` o las dos).

El registro **no es una lista blanca** del endpoint de publicación: una nota puede citar una fuente primaria que no esté (una empresa que se cubre por primera vez), con las mismas reglas.

## Campos de cada fuente

`id`, `name`, `publisher`, `url` (el feed, changelog o página que lee la rutina), `format` (`rss`, `atom`, `html`, `json`), `tier`, `sourceType`, `lang`, `topics`, `editions`, `note` (regla particular de esa fuente, si tiene) y `verifiedAt`.

Algunas reglas particulares que conviene conocer:
- **Releases de Next.js**: los canary son ruido; solo cuentan los estables y los parches de seguridad.
- **Changelog de Cloudflare**: el RSS pesa ~9 MB; se registra la página.
- **arXiv**: un preprint se presenta como preprint, aclarando si tuvo revisión de pares.
- **SemiAnalysis**: sus cifras son estimaciones y se atribuyen como tales.
- **Hugging Face Blog** y **Stack Overflow Blog**: primarias solo para sus propios productos y anuncios.
- **GitHub Advisory Database**: primaria para el registro del aviso; hace falta igual la nota del proveedor para qué se arregló y cuándo.

## Lo que quedó afuera

No se incluye ninguna URL que no se pudo verificar. En la verificación del 2026-11-11 quedaron afuera:

| Candidata | Resultado | Decisión |
| --- | --- | --- |
| `https://x.ai/news` | 200 con un cliente, 403 con el script de verificación | Afuera: bloquea clientes automáticos. Para xAI queda su página de notas de versión de la API. |
| `https://news.ycombinator.com/rss` | 200 con un cliente, 419 con el script | Afuera. Para Hacker News quedan la API oficial y hnrss. |
| Sala de prensa de Intel (`newsroom.intel.com`) | 403 | Afuera. |
| Perplexity (`perplexity.ai/hub`) | 403 | Afuera. |
| SEC EDGAR (feed de 8-K) | 403 | Afuera. |
| TSMC (noticias) | 403 | Afuera. |
| Qualcomm (`/news/rss`) | 404 | Afuera. |
| RSS de Groq, Render, Railway, Turso y OpenJS | 404 | Afuera (de Groq quedó la página del blog). |
| RSS de Cohere y de LangChain | Devuelven una página HTML, no un feed | Afuera. |
| EUR-Lex (`rssId=162`) | 200, pero no se pudo establecer qué contiene ese feed | Afuera. |

## Cómo agregar, cambiar o quitar una fuente

1. Editar `lib/blog/sources.ts` (una línea `src({ … })` por fuente).
2. Correr la verificación:
   ```bash
   node scripts/editorial/verify-sources.mjs
   ```
   Consulta todas las URLs (solo GET) y reescribe `sources-verification.md`. Si una falla, el script termina con error: se arregla la URL o se quita la entrada.
3. Si la corrida es la nueva referencia, actualizar `SOURCES_VERIFIED_AT` en el registro (es la fecha que muestra la página pública) y `CONTENT_UPDATED.sources` en `lib/seo/dates.ts`.
4. `npm test`.

`node scripts/editorial/verify-sources.mjs --check` verifica sin escribir nada.
