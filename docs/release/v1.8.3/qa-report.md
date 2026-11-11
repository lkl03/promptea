# Promptea v1.8.3 — QA integral de v1.8.0–v1.8.2

Fecha: 2026-11-11 · Rama: `v1.8.3-qa` · Base: `main` @ `364ce73` (contiene #34, #35, #36, #37 y #38; `lib/version.ts` = 1.8.2).

Este documento dice **qué se probó, cómo y con qué resultado**, lista los hallazgos por severidad y separa lo verificado de lo que no se pudo verificar. Todo lo marcado "verificado" se repite con los comandos de la sección 8. Las salidas de cada corrida están en [`logs/`](./logs) y las capturas en [`shots/`](./shots).

Severidades: **P0** rompe, seguridad o datos · **P1** funcionalidad o experiencia importante · **P2** pulido.

## 1. Resumen

- Línea base antes de tocar nada: `lint`, `typecheck`, `npm test` (1.565 tests), `build` y `seo:check` local en verde.
- **17 hallazgos**: 0 P0, 6 P1, 11 P2. **14 arreglados o mitigados** en este PR (5 de los 6 P1 y 9 P2); 3 quedan abiertos con decisión del dueño (Q-6, Q-16, Q-17), y la mitigación de Q-3 deja una decisión pendiente.
- Cierre: `lint`, `typecheck`, `npm test` (**1.590 tests**, 25 nuevos), `build` y `seo:check` (785/785 local; 1.095/1.095 contra producción) en verde.
- No se agregaron funciones. La versión no se sube en este PR (lo hace la Parte B).

## 2. Cómo se probó

| Entorno | Para qué | Datos |
| --- | --- | --- |
| **Producción** (`https://www.promptea.me`), solo lectura | `seo:check`, medición de rendimiento, layout de Benchmarks con datos reales, feed de X, confirmación de defectos | Reales. Los scripts abortan todo request que no sea GET (salvo lo que se declara en la sección 7). |
| **Build de producción local** (`npm run build && next start -p 3182`) | `seo:check`, auditoría, rendimiento, degradación sin credenciales, headers, fixtures inalcanzables | Sin Firestore ni keys: el caso "servicios externos caídos". |
| **Dev server local con fixtures** (`BENCHMARKS_DEV_FIXTURE=1 BLOG_DEV_FIXTURE=1`, puerto 3181) | Recorrido visual con contenido, motor, accesibilidad, newsletter, feed de X | Fixtures ficticios ("Demo Labs"), solo en desarrollo. |

Navegadores: Chrome real vía `puppeteer-core` (headless) para la matriz de anchos y temas; el Chrome real del dueño (extensión) para mirar la home de producción a 1920 px y el feed de X con una sesión de verdad.

No se leyó `.env.local`, no se llamó a `/api/internal/*`, no se suscribió ningún email, no se envió feedback y `/api/analyze` solo se ejecutó contra `localhost`.

## 3. Hallazgos

| ID | Sev. | Hallazgo | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| Q-1 | **P1** | **La home y ~25 páginas se renderizaban en cada request.** Las páginas bajo `/[lang]` sin `generateStaticParams` propio eran dinámicas (`Cache-Control: private, no-store`); `export const revalidate = 300` en la home no hacía nada. En producción: TTFB de la home ≈ 1,15 s y de Benchmarks ≈ 1,23 s, contra ≈ 0,25 s de una guía prerenderizada, y una consulta a Firestore por visita a la home. | `logs/build-baseline.txt` (todas `ƒ`), `curl` a producción | **Arreglado**: `generateStaticParams` por locale en el layout. `logs/build-after.txt`: home `●` 5 min, Benchmarks `●` 1 h, y el resto de páginas sin datos de request. El índice filtrable de IA al Día, el artículo, el analizador y `/share` siguen dinámicos. |
| Q-2 | **P1** | **El card del feed de X mostraba el error propio de Elfsight.** Cuando Elfsight no puede leer la cuenta escribe "Failed to fetch user data / timeline data" (en inglés, en los tres idiomas) más su insignia; el card lo contaba como "renderizado" y nunca caía al fallback. Visto en producción el 2026-11-11 (corrida headless); en el Chrome del dueño, minutos después, el feed mostraba 10 publicaciones: la falla es intermitente y del lado de Elfsight. | `logs/xfeed-prod-before.txt`, `shots/xfeed-before__es__1440__aqua-light__widget-without-posts.jpg` | **Arreglado**: el card cuenta publicaciones; cualquier otra cosa termina en el fallback traducido. Caso de regresión en `xfeed-check.mjs` (servicio de datos de Elfsight caído). |
| Q-3 | **P1** | **`/api/analyze` y `/api/analyze-llm` sin ningún límite de uso.** Con una key de proveedor, cada llamada a `/api/analyze` puede disparar hasta dos requests pagos (refinador y juez) y una escritura de telemetría. `/api/analyze-llm` no lo llama ninguna página, aceptaba 20.000 caracteres y hacía una llamada paga por request. | código; `docs/seo-proposals.md` ya lo señalaba | **Mitigado**: 30 y 6 requests por minuto por cliente (`lib/rateLimit.ts`), por instancia, igual que los límites que ya tenían feedback, newsletter y transcripción. Frena un loop, no un ataque distribuido: el límite compartido (Redis) y **qué hacer con `/api/analyze-llm`** quedan como decisión del dueño. |
| Q-4 | **P1** | **Los packs de prompts desbordan en móvil.** `/prompts/data` a 375 px mide 20–35 px más que la pantalla en es, en y pt (una línea larga sin espacios dentro de una plantilla). En producción. | `sweep.mjs` contra producción y local | **Arreglado** en los seis packs. |
| Q-5 | **P1** | **Un fallo de Firestore dejaba un 404 cacheado en los gemelos `.md` de IA al Día.** La ruta es ISR y Next cachea cualquier status de un route handler: una búsqueda fallida respondía 404 y ese 404 reemplazaba a la copia buena durante 5 minutos. | `node_modules/next/dist/build/templates/app-route.js` (cachea `response.status`) | **Arreglado**: una búsqueda fallida con la base configurada hace fallar el request (no se cachea, sigue sirviendo la copia anterior). Test de regresión. |
| Q-6 | **P1** | **`npm audit --omit=dev`: 26 avisos (4 críticos, 9 altos).** Directas: `next` 16.1.1 (arreglado en 16.4.6; la lista incluye DoS de Server Components, envenenamiento de caché de páginas SSG/ISR y bypass del proxy) y `zod` < 4.6.6. `@anthropic-ai/sdk` no tiene avisos. Mismo conjunto que en v1.8.1. | `logs/npm-audit-prod.json` | **Abierto — decisión del dueño.** No se actualizó acá: es una actualización del framework a través de tres minors y merece su propio PR con deploy de preview. Recomendado como próximo paso. |
| Q-7 | P2 | El feed de X pedía ~165 KB de código de terceros durante la hidratación en desktop (el card está en pantalla desde el inicio): primer request a Elfsight a 4,55 s con LCP a 4,54 s y `load` a 4,65 s en producción. | `logs/xfeed-prod-before.txt` | **Arreglado**: espera al evento `load` y a un momento de inactividad. |
| Q-8 | P2 | Sin JavaScript el card del feed decía "Cargando el feed…" para siempre. | `xfeed-check.mjs` | **Arreglado** (`<noscript>` con el link al perfil). |
| Q-9 | P2 | Los errores del analizador y de "Elegir IA" se mostraban en inglés: el identificador del servidor ("Validation error") o el mensaje del navegador ("Failed to fetch"). | código de `PromptBox` y `MatcherBox` | **Arreglado**: mensaje traducido (y uno específico para el límite de uso). |
| Q-10 | P2 | La home bajo `/pt` no avisaba que los titulares están en inglés, y el texto en inglés no llevaba `lang` (WCAG 3.1.2). | `shots/home__pt__*` | **Arreglado**: aviso en "Últimas do AI Daily" y `lang="en"` en titulares de la home, del marquee y de las tarjetas de IA al Día. |
| Q-11 | P2 | Dos detectores del motor no eran equivalentes entre idiomas: "five bullet points" daba `missing_summary_length` en inglés (en es/pt no) y "para clientes recurrentes" daba `missing_marketing_audience` en español (en en/pt no). | `logs/engine-qa.txt` (primera corrida) | **Arreglado** (engine 2.4.1), test de regresión; el dataset de calibración no se movió. |
| Q-12 | P2 | 153 KB de fuentes precargadas en cada página, aunque Aqua y Metro (los temas por defecto) usan fuentes del sistema. | `logs/perf-prod.txt` | **Arreglado**: solo se precarga la monoespaciada; con Aqua bajan a 43–57 KB. Glass las sigue cargando, a demanda (CLS 0–0,001). |
| Q-13 | P2 | Faltaban headers de seguridad (solo estaba HSTS) y se enviaba `X-Powered-By`. | `curl -I` a producción | **Arreglado**: `nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`. **Sin CSP** (ver sección 6). |
| Q-14 | P2 | `seo:check` daba un falso negativo: en dos corridas contra producción, un request de ~1.100 se perdió a nivel de red, en una URL distinta y sana cada vez (un gemelo `.md` del blog, después `/pt/models/deepseek`). No hay intermitencia en los gemelos: 12 medidos responden 200 en ≈ 0,2 s. | `logs/seo-check-prod-run1.txt` | **Arreglado**: reintenta errores de transporte (nunca un status HTTP) y los informa como advertencia. `logs/seo-check-prod-run2.txt`: 1.095/1.095. |
| Q-15 | P2 | Aviso de hidratación en desarrollo, intermitente y solo con cargas en paralelo: el `id` generado del menú del header difería entre servidor y cliente. Inofensivo (los dos atributos quedan con el valor del servidor). | `logs/sweep-all.txt` | **Arreglado** con un id fijo. No apareció en el build de producción. |
| Q-16 | P2 | Aqua: la etiqueta del botón primario mide 4,02:1 (AA pide 4,5:1). Ya listado en v1.8.1 (A11Y-1). | `logs/a11y-check.txt` | **Abierto — decisión del dueño** (cambia el color de marca del tema). |
| Q-17 | P2 | 27 títulos de guías de 91–120 caracteres (SEO-1 de v1.8.1) y `llms-full.txt` cerca del tope: 398 KB (es), 360 KB (en), 342 KB (pt) contra 400 KB. | producción | **Abierto.** El tope lo aplica el generador (recorta IA al Día, nunca la parte explicativa), así que no se rompe; reescribir títulos es trabajo editorial. |

## 4. Matriz de pruebas

### 4.1 Portugués (v1.8.2)

| Qué | Cómo | Resultado |
| --- | --- | --- |
| Recorrido de 23 páginas × es/en/pt × 1440, 768 y 375 px; home y analizador en los 3 temas × claro/oscuro | `i18n-qa.mjs --widths=1440,768,375 --shots=1` (dev con fixtures) | **297 cargas, 0 fallas**: sin desborde, sin texto cortado en controles, `<html lang>` correcto, selector ES \| EN \| PT en una fila en móvil con el actual marcado, ningún texto en inglés o español bajo `/pt` fuera de las zonas que lo son a propósito. |
| **Las 58 guías traducidas** (más el índice), en los tres idiomas | `sweep.mjs --match=/guides` | **531 cargas (177 páginas × 3 anchos), 0 hallazgos reales**: sin desborde, sin texto cortado, un `<h1>`. (La primera corrida marcó "Templates" como no traducido: es el término del glosario; se corrigió la lista del script.) |
| Todas las demás URLs del sitemap, en Glass oscuro | `sweep.mjs` con el resto de rutas | 534 cargas: aparecieron Q-4 y Q-15. Tras los fixes, los packs: 42 cargas, 0 hallazgos. |
| Analizador con un prompt real en portugués, desde la interfaz | `i18n-qa.mjs` (flujo final, 1440 y 375) | Resultados en portugués ("Qualidade", "Prompt otimizado", "Recomendações"), sin cadenas en es/en. `shots/analyzer-result__pt__*`. |
| Calidad de las traducciones (mecánica) | análisis sobre 2.007 textos en pt (diccionario, 58 guías, glosario, modelos, landings, páginas) | Sin `ñ ¿ ¡`, sin terminaciones `-ción`, sin voseo arrastrado, sin formas de "tu", sin vocabulario de Portugal, sin "de graça"; `score` solo como nombre de placeholder; placeholders `[…]` de las plantillas conservados. Quedó como test (`i18n.pt-content.test.ts`). |
| Calidad de las traducciones (lectura) | muestreo manual: mensajes de error del diccionario, home, analizador | Naturales y consistentes con `docs/i18n/pt-glossary.md`. **No reemplaza una revisión nativa** (pendiente del dueño). |
| Avisos de "contenido en inglés" y canonical al original bajo `/pt` | `seo:check` (grupo "/pt views") + capturas | Blog, resumen semanal y artículo: aviso visible, canonical → `/en/…`. La home no avisaba: Q-10. |
| Formulario de newsletter en pt | captura + tests con mocks (`newsletter.subscribe.spec.ts`: `lang: "en", uiLang: "pt"`; `lang: "pt"` rechazado) | Ofrece inglés (preseleccionado) y español y dice que no hay edición en portugués. **No se hizo un alta real.** |
| Foco y teclado | `a11y-check.mjs` | 77/77 (una excepción conocida, Q-16). |

### 4.2 Motor (engine 2.4.0 → 2.4.1)

`engine-qa.mjs` contra `localhost`, sin keys: los **8 propósitos × un prompt real escrito en pt, es y en**.

| Qué | Resultado |
| --- | --- |
| Mismo idioma de prompt e interfaz (24 corridas): score 0–100, seis dimensiones, `meta.optimizedScore`, sin `language_mismatch`, sin texto del motor en otro idioma | 24/24 |
| Idempotencia: re-analizar el optimizado no lo hace crecer, no repite encabezados y (salvo imagen) mantiene el score a ±10 | 24/24 |
| El prompt en portugués analizado desde `/es` y `/en`: mismo tipo de tarea, mismos ids de hallazgos, score a ±3, sin `language_mismatch` | 16/16 |
| Sin keys: `engine: "deterministic"`, `fallbackReason: "disabled"`, sin `meta.judge` (`PROMPT_JUDGE_ENABLED` apagado) | 24/24 |

Antes → después (igual en los tres idiomas salvo donde se indica): text 57 → 57, study 46 → 46, code 41 → 41 (es 38), data 66 → 69, image 40 → 64 (pt 46 → 62, compuesto en inglés con `optimizedPromptLang: "en"`), marketing 41 → 41 (pt 49), translation 48 → 48 (es 46), summarization 56 → 56. Sin proveedor LLM el camino determinístico es liviano y en 6 de 8 propósitos el "después" es igual al "antes" (misma observación que en v1.8.1).

El failover de proveedores y el juez están cubiertos por tests con `fetchImpl` simulado (`llm.providers.test.ts`, `refine.adaptive.test.ts`); **no se probaron con credenciales reales** (no hay).

### 4.3 Home, UI y newsletter (v1.8.1)

| Qué | Cómo | Resultado |
| --- | --- | --- |
| Home en producción a 1920 px: header, los dos links de acción, caja del prompt, marquee, "Latest in AI Daily", feed de X | Chrome real del dueño | Correcto; el feed mostraba 10 publicaciones. |
| Jerarquía de botones (principal relleno, secundario transparente) en los 3 temas × claro/oscuro; 1440, 768 y 375 | capturas `shots/home__*` | Correcto en los 18. Metro plano. |
| Tarjeta de newsletter (5 s en primera visita, pastilla después, un solo controlador, cierre persistente, suscripto = nunca, móvil sin tapar el textarea, sin foco robado), header móvil, foco visible, nombres accesibles, contraste | `a11y-check.mjs` + `newsletter.card.test.ts` | 77/77. La telemetría de eventos se cubre en `telemetry.newsletter.spec.ts`. |
| Fondo animado | `ambient-check.mjs` sobre el build | Aqua 162 px (11,2 % del ancho) en 4 s; Glass claro y oscuro 95 px (6,6 %); 75 fps, 0 long tasks, **0 layouts**, CLS 0; Metro sin blobs; `prefers-reduced-motion` estático. (El script ahora excluye el widget de X, que al cargar después del `load` caía dentro de la ventana de medición: ≈ 100 layouts que son del widget, no de la animación.) |
| Biblioteca con almacenamiento bloqueado o lleno | `qa-local.mjs` (storage que lanza) + `library.share.test.ts` (`setItem` que lanza → `saveFailed`) | Sin errores; muestra el aviso. |
| Tarjeta compartible `/api/share/card` | `qa-local.mjs`: parámetros válidos, ausentes, fuera de rango, no numéricos, con `<script>`, de 4.000 caracteres | Siempre imagen o 4xx limpio, nunca 5xx, nunca refleja texto ni recibe el prompt. `Cache-Control: public, max-age=86400, s-maxage=31536000, immutable`. |

### 4.4 Feed de X (widget de Elfsight)

`xfeed-check.mjs`. "Antes" = producción; "después" = local con el fix.

| Pregunta | Antes | Después |
| --- | --- | --- |
| ¿El HTML del servidor incluye el script del widget? | No | No |
| ¿El HTML crawleable depende de él? | No: el link al perfil está en el HTML (2–3 links) | Igual |
| Desktop: ¿cuándo sale el primer request a Elfsight? | 4.555 ms, **antes** del `load` (4.647 ms), junto con el LCP (4.544 ms) | 1.677 ms, **después** del `load` (1.475 ms) |
| Móvil: ¿carga con el card lejos del viewport? | No (0 requests) | No (0 requests) |
| Costo | 6 requests iniciales, ≈ 164 KB (más las imágenes de las publicaciones) | Igual; solo cambia cuándo |
| Altura reservada | 460 px antes y después | 460 px antes y después |
| CLS de la página | 0,002 | 0,008 (dev) |
| Bloqueado (adblock) | Fallback con link al perfil | Igual |
| El script carga pero Elfsight no trae publicaciones | **Muestra el error de Elfsight en inglés** | Fallback traducido |
| Sin JavaScript | "Loading the feed…" para siempre | Link al perfil |
| Temas claro y oscuro | Publicaciones en Aqua, Glass oscuro y Metro | Igual |
| Privacidad | `app/[lang]/privacy/page.tsx` declara el embed en es, en y pt (qué carga, cuándo y qué datos reciben Elfsight y X) | Sin cambios |

19/19 comprobaciones después del fix. INP no se midió (necesita interacción real).

### 4.5 Benchmarks

| Qué | Cómo | Resultado |
| --- | --- | --- |
| Layout de "Ranking por benchmark" con **datos reales de producción** | `benchmarks-layout.mjs --base=https://www.promptea.me` | 30 comprobaciones (1920, 1440, 1024, 768, 375 × 6 categorías con 1, 2, 4 y 14 benchmarks): sin solape, sin hueco, sin desborde. |
| Lo mismo con fixtures (categorías de 1, 2 y 14) | ídem contra dev | 30 comprobaciones, 0 hallazgos. |
| Peso del HTML de `/en/benchmarks` | `perf.mjs` contra producción | **369 KB** sin comprimir (675 KB en la auditoría de v1.8.0). |
| Estado vacío honesto sin `OPENROUTER_API_KEY` ni Firestore | build local | 200, `/pt/benchmarks.md` 200 con el texto "no disponible". |
| Donut, scatter, calculadora, tabla accesible | `a11y-check.mjs` (gráficos `role="img"` con nombre y descripción) + capturas `shots/benchmarks__pt__*` | Correcto. **No se probó la interacción de la calculadora de costo valor por valor.** |

### 4.6 SEO / GEO

| Qué | Resultado |
| --- | --- |
| `BASE_URL=https://www.promptea.me npm run seo:check` | **1.095/1.095** (segunda corrida; la primera tuvo el falso negativo de Q-14). Cubre robots con los 12 crawlers de IA, sitemap (590 URLs, 0 duplicadas, ninguna redirige), hreflang recíproco entre es, en, pt-BR/pt y `x-default`, canonical, un solo `<h1>`, sin metas duplicadas, JSON-LD con `@id` resueltos y consistente con el texto visible, `llms.txt` y cada link, 357 comprobaciones de gemelos `.md`, entrada de idioma del proxy y las vistas `/pt` de contenido sin versión en portugués. |
| `seo:check` contra el build local (con los cambios de este PR) | **785/785**, 0 advertencias. |
| Gemelos `.md` de notas de blog: ¿intermitencia? | No. 12 medidos: 200 en 0,18–0,21 s; se sirven desde la caché ISR y revalidan bien (`STALE` → `HIT` con `Age` reiniciado). El "estado 0" era de red (Q-14). El riesgo real era otro: Q-5. |
| `llms-full.txt` | es 398 KB, en 360 KB, pt 342 KB; tope de 400 KB aplicado por el generador. |
| Títulos de `/es|en/blog/weekly/*` | 14 ediciones medidas: 59–73 caracteres con el sufijo. |
| `noindex` | `/library` y `/share`: `noindex, follow` (producción y local). |
| Rich Results Test, Schema Markup Validator, Search Console, Bing | **No verificado**: no se pueden correr desde acá. Pendiente del dueño. |

### 4.7 Rendimiento

`perf.mjs` (Chrome real; móvil = 375×812 con CPU ×4; red sin limitar). Los **tiempos no son comparables** entre un servidor local y producción; los bytes, el DOM y el CLS sí. El build local no tiene analytics ni contenido de blog/benchmarks. **No se corrió Lighthouse** (no está en el proyecto y no se agregaron dependencias) y no se midió INP.

Producción hoy (tema Glass, el más pesado):

| Página | LCP desktop / móvil | CLS | HTML | JS | Fuentes |
| --- | --- | --- | --- | --- | --- |
| `/es` | 1.740 / 1.512 ms | 0,002 / 0,004 | 90 KB | 489 / 328 KB | 153 KB |
| `/pt` | 1.108 / 1.480 ms | 0,002 / 0,004 | 90 KB | 489 / 328 KB | 153 KB |
| `/en/analyzer` | 792 / 976 ms | 0 | 86 KB | 371 KB | 153 KB |
| `/pt/analyzer` | 776 / 1.224 ms | 0 | 88 KB | 371 KB | 153 KB |
| `/en/benchmarks` | 1.348 / 1.600 ms | 0 | 369 KB | 398 KB | 153 KB |
| `/pt/benchmarks` | 1.364 / 1.352 ms | 0 | 371 KB | 398 KB | 153 KB |
| `/en/blog` | 1.308 / 1.476 ms | 0 | 130 KB | 489 / 328 KB | 153 KB |
| `/en/guides/json-output` | 412 / 584 ms | 0 | 72 KB | 325 KB | 153 KB |
| `/pt/guides/json-output` | 436 / 600 ms | 0 | 74 KB | 325 KB | 153 KB |

Lo que cambia con este PR, medido:

| Métrica | Antes (producción) | Después (build local) | ¿Comparable? |
| --- | --- | --- | --- |
| TTFB de la home | ≈ 1,15 s (render por request) | prerenderizada (`x-nextjs-cache: HIT`) | La causa sí (dinámica → ISR); el número exacto se confirma en Vercel. |
| Fuentes con Aqua (tema por defecto), home / analizador / guía | 153 KB | 56 / 43 / 57 KB | Sí |
| CLS con Glass (ahora sin preload de sus fuentes) | 0–0,004 | 0–0,001 | Sí |
| Primer request de terceros en desktop | antes del `load` | después del `load` | Sí |

Costo del widget de X: ≈ 164 KB iniciales. Costo de las animaciones: 0 layouts y 0 long tasks en reposo (sección 4.3).

### 4.8 Degradación

| Caso | Resultado |
| --- | --- |
| Sin Firestore, sin `OPENROUTER_API_KEY`, sin `GROQ_API_KEY`/`ANTHROPIC_API_KEY` | Es el build local: `/pt`, `/pt/blog`, `/pt/blog/weekly`, `/pt/benchmarks`, `/pt/library`, `/pt/share`, `/pt/changelog`, `/pt/privacy`, `/pt.md`, `/pt/benchmarks.md`, `/pt/guides/json-output.md` → 200; `/en/blog/nope.md` y una ruta inexistente → 404. |
| Sin `NEXT_PUBLIC_X_HANDLE` | El card usa el link genérico (test de `resolveXLinks`). |
| JavaScript deshabilitado (9 páginas) | `qa-local.mjs`: 200, un `<h1>`, contenido y navegación; la caja de la home es un formulario GET. |
| `localStorage`/`sessionStorage` bloqueados (9 páginas, pasados los 5 s del aviso) | `qa-local.mjs`: sin errores; la caja de la home cae a `?prompt=`. |
| **Fixtures de desarrollo en producción** | Build de producción levantado **con** `BLOG_DEV_FIXTURE=1 BENCHMARKS_DEV_FIXTURE=1`: 0 apariciones de "Demo Labs"/"Demo Kite" en `/en`, `/en/blog`, `/en/benchmarks`, feed, sitemap y `llms-full.txt`; el artículo de ejemplo responde 404 (`logs/prod-build-checks.txt`). |

### 4.9 Seguridad

| Qué | Resultado |
| --- | --- |
| Parámetros de `/share` y `/api/share/card`, XSS desde la URL | `qa-local.mjs`: 200 o 4xx, `noindex`, sin marcado reflejado. |
| XSS desde `localStorage` | La biblioteca sanea entrada por entrada (`library.share.test.ts`); React escapa el texto. |
| Validators con `lang: "pt"` | `AnalyzeSchema` y los demás derivan de `LANGS`; el motor responde 200 con `lang: "pt"` (sección 4.2). |
| Límites de uso | Antes: feedback, newsletter y transcripción. Ahora también `/api/analyze` y `/api/analyze-llm` (Q-3). **Sin límite**: `/api/match` (determinístico, sin costo externo), `/api/feedback` y `/api/telemetry*` (escriben en Firestore): listado, decisión del dueño. |
| Headers | Q-13. |
| `npm audit` | Q-6. |
| Versión | `lib/version.ts`, `package.json`, `package-lock.json`, footer, README, CHANGELOG y tarjetas de `/changelog` en los tres idiomas coinciden en 1.8.2 (`version.sync.test.ts`); el README lista las variables de entorno vigentes. |

## 5. Tests y comandos de cierre

| Comando | Resultado |
| --- | --- |
| `npm run lint` | sin errores ni avisos |
| `npm run typecheck` | sin errores |
| `npm test` | **1.590 tests en 74 archivos**, todos en verde (1.565 al empezar) |
| `npm run build` | OK |
| `npm run seo:check` (build local) | 785/785 |
| `BASE_URL=https://www.promptea.me npm run seo:check` | 1.095/1.095 |
| `audit.mjs` (build local) | 580 cargas, 0 hallazgos (nota al final de la sección 9) |

Tests nuevos: `rateLimit.test.ts`, `api-rate-limit.spec.ts` (límites y headers), `i18n.pt-content.test.ts`, `engine.parity-v183.test.ts`, y los casos de `seo.routes.test.ts` para Q-5.

## 6. Decisiones tomadas

- **ISR por locale (Q-1).** Se declaró la lista de locales en el layout en vez de agregar `generateStaticParams` página por página: es una línea, cubre también las páginas futuras y deja dinámicas, sin tocarlas, a las que leen `searchParams`. Consecuencia a tener presente: una página prerenderizada que no puede leer Firestore al revalidar guarda su versión vacía hasta la próxima revalidación (5 minutos en la home). Es el mismo criterio "degradar a vacío" que ya tenía el sitio, ahora con una ventana de 5 minutos en vez de por request.
- **Sin Content-Security-Policy (Q-13).** La página carga scripts de terceros cuyos orígenes cambian (Elfsight y sus subdominios, Google Ads opcional, Vercel Analytics); una política equivocada los rompe en silencio. Corresponde desplegarla primero en modo `Report-Only`.
- **Límite por instancia (Q-3).** Sin infraestructura nueva. Los valores (30/min y 6/min) están muy por encima del uso a mano: la interfaz manda un request por clic.
- **`seo:check` (Q-14).** Reintenta solo errores de transporte; un 404, un 500 o una redirección nunca se reintentan.

## 7. Qué se escribió en producción

La consigna era no escribir en producción. Se cumplió con dos salvedades que corresponde declarar:

1. La primera corrida de `benchmarks-layout.mjs` contra producción salió **sin** el filtro de solo-GET (el parche que lo agrega no se había aplicado todavía). Cargó `/en/benchmarks` cinco veces durante varios segundos cada una, así que pudo enviar hasta **5 eventos anónimos `newsletter_prompt_impression`** a `/api/telemetry/app` y las vistas de página de Vercel Analytics: lo mismo que cinco visitas normales. No hubo altas, feedback, análisis ni publicaciones. El script ahora aborta todo lo que no sea GET fuera de localhost.
2. La visita a `https://www.promptea.me/en` con el Chrome del dueño (extensión) es una visita real: una vista de página y, a los 5 s, a lo sumo un evento de impresión del aviso de newsletter.

Todo lo demás contra producción (`seo-check`, `perf`, `sweep`, `xfeed-check`, la segunda corrida de `benchmarks-layout`) fue GET.

## 8. Lo que no se pudo verificar

1. **El efecto de Q-1 en Vercel**: se verificó en `next start` local (rutas `●`, `x-nextjs-cache: HIT`); el TTFB real se confirma en el deploy de preview o en producción.
2. **Motor con LLM en producción**: refinador, failover y juez. Solo el camino determinístico y los tests con mocks.
3. **Alta real al newsletter** y envío de emails.
4. **Validadores externos**: Rich Results Test, Schema Markup Validator, Search Console, Bing Webmaster Tools.
5. **Revisión nativa del portugués.** Los controles de este QA son mecánicos y de muestreo.
6. **Lector de pantalla real, dispositivo táctil físico, Lighthouse e INP.**
7. **El estado "límite mensual de vistas alcanzado" de Elfsight**: se simuló la falla de su servicio de datos, no ese estado en particular.
8. **La calculadora de costo de Benchmarks**, valor por valor.

## 9. Cómo repetir

```bash
npm run build && npx next start -p 3182
BASE_URL=http://localhost:3182 npm run seo:check
BASE_URL=https://www.promptea.me npm run seo:check                      # solo lectura
node scripts/release/qa-local.mjs --base=http://localhost:3182
node scripts/release/ambient-check.mjs --base=http://localhost:3182
node scripts/release/perf.mjs --base=http://localhost:3182 --theme=aqua
node scripts/release/audit.mjs --base=http://localhost:3182

# con contenido de ejemplo (solo desarrollo):
BENCHMARKS_DEV_FIXTURE=1 BLOG_DEV_FIXTURE=1 NEXT_PUBLIC_X_HANDLE=promptea_me npx next dev -p 3181
node scripts/release/i18n-qa.mjs --base=http://localhost:3181 --widths=1440,768,375 --shots=1
MSYS_NO_PATHCONV=1 node scripts/release/sweep.mjs --base=http://localhost:3181 --match=/guides
node scripts/release/engine-qa.mjs --base=http://localhost:3181
node scripts/release/xfeed-check.mjs --base=http://localhost:3181
node scripts/release/a11y-check.mjs --base=http://localhost:3181
node scripts/release/benchmarks-layout.mjs --base=https://www.promptea.me   # solo lectura
```

En Git Bash un argumento que empieza con `/` se convierte en ruta de Windows: usar `MSYS_NO_PATHCONV=1` con `--match=/…` y `--pages=/…`.

**Nota sobre `audit.mjs`:** corrida completa sobre el build local con los cambios de este PR: **580 cargas (29 páginas × 5 anchos × Aqua claro, Glass claro, Glass oscuro y Metro), 0 hallazgos**: sin desborde horizontal, CLS ≤ 0,002, un `<h1>`, un canonical, sin errores de página. La salida cruda (`logs/audit.txt`) lista 580 entradas de consola, todas la misma y todas ajenas al sitio: con el header nuevo `X-Content-Type-Options: nosniff`, Chrome informa "Refused to execute script" para `/_vercel/insights/script.js`, el script de Vercel Analytics, que solo existe en Vercel (en local responde 404). El script ya trataba ese 404 como esperado y ahora también ignora este mensaje; con el filtro, 0 hallazgos. Dos cosas del propio script se corrigieron en el camino: esperaba "red inactiva", que en páginas prerenderizadas no llega nunca en una segunda visita (Chrome responde desde su caché los prefetch repetidos del router y DevTools no los da por terminados; dentro de la página sí terminan: 49 de 49 en ≤ 16 ms, y las navegaciones cliente tardan 46–117 ms), así que la primera corrida avanzaba a una carga cada 30 s; ahora espera `load` más una pausa fija.
