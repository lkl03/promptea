# AI Daily Tech — diseño y modelo de datos (v1.8.3)

Una nota de tecnología por día, siempre con relación a la IA o al desarrollo de software (nube y plataformas, frameworks y runtimes, herramientas para desarrollar, hardware), integrada a AI Daily como una sección más. Este documento explica qué se decidió y por qué; el código está comentado en los mismos lugares.

## 1. Modelo de datos

| Concepto | Dónde | Valor |
| --- | --- | --- |
| Edición nueva | `lib/domain.ts` `BLOG_EDITIONS` | `tech-daily` (agregada al final; las cuatro anteriores no cambian) |
| Prefijo de id | `EDITION_KEY_PREFIX` | `ai-tech` → documento `ai-tech_<YYYY-MM-DD>`, idempotency key `ai-tech:<YYYY-MM-DD>` |
| Ediciones "de una nota" | `STORY_EDITIONS` | `daily`, `daily-morning`, `tech-daily` |
| Ediciones semanales | `WEEKLY_EDITIONS` | `weekly-recap`, `week-ahead` |
| Secciones para el lector | `BLOG_SECTIONS`, `SECTION_OF_EDITION` | `ai` (las cuatro ediciones anteriores) y `tech` (`tech-daily`) |
| Categorías nuevas | `BLOG_CATEGORIES` | `cloud`, `web-platform`, `hardware` (agregadas al final) |
| Slugs reservados | `RESERVED_BLOG_SLUGS` | `tech`, `weekly`, `feed` |

**Un documento por edición y fecha.** La nota tech de un día vive en `ai-tech_2026-11-12`, al lado de `ai-daily_2026-11-12` y `ai-morning_2026-11-12`. Ninguna puede pisar a otra, y una segunda corrida de la rutina tech el mismo día devuelve `already_published`. Es el mismo mecanismo que ya separaba la edición de la mañana (v1.5.0).

**Una sola lista decide las reglas.** Antes, "¿es una nota del día?" estaba escrito tres veces como `edition === "daily" || edition === "daily-morning"` (schema, guard de frescura, newsletter). Ahora lo responde `isStoryEdition()`: una edición de `STORY_EDITIONS` cubre un hecho, no declara ventana de cobertura, debe estar fechada hoy y es la única que una persona puede publicar con fecha anterior (`allowBackdate`, con motivo visible). Todo lo demás es semanal.

**Categorías compartidas.** Las categorías son del blog, no de una edición: la rutina tech usa las tres nuevas más `developer-tools`, `infrastructure`, `security` y `open-source`, que ya existían. No hay validación cruzada categoría ↔ edición: una nota de IA sobre un chip puede ser `hardware`.

## 2. Retrocompatibilidad

- Ningún documento existente cambia. El lector (`lib/blog/server.ts`) no valida ediciones: un documento sin `edition` sigue siendo `daily`, y un documento con una edición que este build no conoce se lee como sección `ai` (`sectionOfEdition()` es total).
- El schema de publicación acepta exactamente lo mismo que antes para las cuatro ediciones anteriores. La única regla nueva que puede rechazar algo que antes pasaba es la de slugs reservados (`tech`, `weekly`, `feed`), que eran slugs inalcanzables de todos modos.
- `NewsletterLocaleContent.techStories` es **opcional**: las ediciones del resumen semanal ya guardadas no lo tienen y se siguen leyendo, mostrando y reenviando igual (test de regresión byte a byte del HTML).
- `/{lang}/blog/feed.xml` sigue siendo el feed de la sección IA. No incluye notas tech: sus suscriptores se anotaron a noticias de IA.

## 3. Rutas

| Ruta | Qué es | Idiomas |
| --- | --- | --- |
| `/{lang}/blog` | Sección IA (sin cambios de URL) | es, en; `/pt` muestra la edición en inglés |
| `/{lang}/blog/tech` | Sección Tech: índice con búsqueda, filtros y paginación propios | es, en; `/pt` muestra la edición en inglés |
| `/{lang}/blog/tech/feed.xml` | RSS de la sección Tech | es, en; `/pt` redirige al inglés |
| `/{lang}/blog/{slug}` | Artículo (IA o Tech: mismo espacio de slugs) | es, en; `/pt` lo muestra en inglés |
| `/{lang}/blog/weekly` | Archivo del resumen semanal | sin cambios |
| `/{lang}/sources` | Cómo elegimos y verificamos las fuentes | es, en, pt |

Los artículos tech comparten `/blog/{slug}` con los de IA: un solo espacio de slugs (el endpoint ya rechaza colisiones), una sola página de artículo, y ningún link roto si algún día una nota cambia de sección. El artículo sabe a qué sección pertenece: el breadcrumb (visible y JSON-LD) es Inicio › AI Daily › Tech › nota, y "volver" lleva a `/blog/tech`.

Bajo `/pt` se aplica el criterio de la v1.8.2: se muestra el original en inglés con el aviso traducido, `canonical` → `/en/blog/tech`, sin entrada en el sitemap ni en `llms.txt` de portugués.

Las dos páginas de índice son una sola implementación (`components/blog/BlogIndexView.tsx`) con un parámetro `section`.

## 4. Decisiones de interfaz

**Pestañas: IA | Tech | Resumen semanal** (`components/blog/DailyTabs.tsx`), cada una con su URL. La primera se llamaba "Noticias"; pasa a "IA" porque ahora hay dos clases de noticias.

**Home: mezclado, no un carril propio** (`lib/blog/latest.ts`). El bloque "Lo último en IA al día" sigue mostrando cuatro notas:
- la principal es siempre de IA (el bloque se llama AI Daily y el lugar grande mantiene esa promesa);
- la fila de abajo son las más nuevas de las dos secciones, con **a lo sumo una** nota tech, etiquetada "Tech · categoría";
- aparece un botón "Tech" hacia `/blog/tech` cuando hay al menos una nota tech reciente (no se enlaza a una página vacía).

Por qué no un carril aparte: la home se reconstruyó en la v1.8.1 para entrar en ~1.900 px; un bloque más para una nota por día empuja Benchmarks y el newsletter hacia abajo. Por qué un tope: con una nota tech y hasta dos de IA por día, sin tope Tech ocuparía un tercio del bloque, o todo en un día flojo de IA.

**Marquee**: mezcla las dos secciones (son titulares de las últimas 72 horas, sin jerarquía).

**Filtro de edición**: cada índice ofrece solo las ediciones que tiene. En Tech hay una sola, así que la fila de chips no se muestra y las tarjetas no repiten el chip "Tech".

## 5. Resumen semanal

`lib/newsletter/compose.ts`:
- "Esta semana en IA", la nota destacada y el asunto siguen saliendo solo de las notas de IA.
- Bloque nuevo **"Tech de la semana"**: hasta tres notas tech de la semana, con el mismo criterio de orden (importancia, después fecha).
- Una semana con notas tech y ninguna de IA no genera edición: el resumen es la semana en IA y Tech es un bloque dentro.
- Se muestra en el email (HTML y texto) y en la página de la edición. Sin notas tech, el bloque no existe.

## 6. SEO y descubrimiento

- Sitemap: `/es|en/blog/tech` con la fecha de su nota más nueva; cada índice toma la fecha de su propia sección.
- `llms.txt`: el índice Tech figura en "AI Daily", y las notas tech se agrupan bajo "AI Daily Tech — últimas notas" (`EDITION_HEADINGS`).
- JSON-LD: el índice Tech es `CollectionPage` + `Blog` + breadcrumb de tres niveles; el artículo es `NewsArticle` con breadcrumb de cuatro.
- Gemelos `.md`: cada nota tech tiene el suyo, como cualquier artículo. `/sources.md` también.
- `scripts/seo-check.mjs` audita `/blog/tech` y `/sources` en los tres idiomas, la vista `/pt/blog/tech` y la redirección del feed.

## 7. Qué queda fuera del repositorio

La rutina que investiga y publica es externa (`docs/editorial/tech-daily-routine.md`). Hasta que se dé de alta, `/blog/tech` muestra su estado vacío ("La primera nota Tech está en camino"), la home no muestra el botón Tech y el resumen semanal no tiene bloque Tech. Nada de esto se puede probar con notas reales antes de eso: se verificó con el fixture de desarrollo (`BLOG_DEV_FIXTURE=1`, cuatro notas tech ficticias) y con tests.
