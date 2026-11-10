# Promptea v1.8.1 — auditoría visual y reporte de QA

Fecha: 2026-11-10 · Rama: `claude/stoic-greider-4d1132` · Base: `main` @ `1134a83` (contiene #34, #35 y #36).

Este documento dice **qué se probó, cómo, con qué resultado**, y separa lo que se verificó de verdad de lo que no se pudo verificar. Todo lo marcado "verificado" se puede repetir con los comandos de la sección 7.

> **Actualización del 2026-11-10, posterior al merge de #37 (pedido del dueño):** (1) el marquee de noticias volvió a la home, debajo del header; (2) el feed de X ya no usa el embed oficial (hallazgo V-9) sino un widget de Elfsight, con estilos propios para los tres temas. Verificado en local: carga en recarga y en navegación interna (home ↔ IA al Día), 10 publicaciones reales, sin scroll horizontal, y fallback al perfil cuando no renderiza. Lo que sigue describe el estado al momento del PR.

## 1. Cómo se probó

| Entorno | Para qué | Datos |
| --- | --- | --- |
| **Producción** (`https://www.promptea.me`), solo lectura | Línea base "antes", confirmar los defectos reportados | Reales. Las capturas y mediciones automáticas abortan todo request que no sea GET (telemetría incluida), así que no se escribió nada. |
| **Build de producción local** (`npm run build && next start`) | `seo:check`, auditoría de consola/desborde/CLS, rendimiento, degradación | Sin Firestore ni keys: es exactamente el caso "servicios externos caídos". |
| **Dev server local** con fixtures (`BENCHMARKS_DEV_FIXTURE=1`, `BLOG_DEV_FIXTURE=1`) | Revisión visual con contenido, motor, accesibilidad, newsletter | Fixtures claramente ficticios ("Demo Labs"), solo alcanzables en desarrollo. |

Navegadores: **Chrome real del dueño** (extensión Claude in Chrome) para 1920 px, la home, Benchmarks y el feed de X en producción y en local; **Chrome real vía puppeteer-core** (el mismo binario, headless) para la matriz de anchos y temas, porque la extensión no cambia el viewport de una ventana maximizada (`innerWidth` siguió en 1920, se verificó); y el navegador integrado de la app para pruebas interactivas a 1440 y 375.

No se leyó `.env.local`, no se llamó a `/api/internal/*`, no se suscribió ningún email, no se envió feedback, y `/api/analyze` solo se ejecutó contra `localhost`.

## 2. Lista de defectos (auditoría de la v1.8.0 en producción)

Capturas "antes": [`before/`](./before). Capturas "después": [`after/`](./after).

| ID | Sev. | Defecto | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| V-1 | **P0** | Benchmarks, desktop: la tarjeta del benchmark queda debajo del panel del gráfico, cortada, con un hueco enorme debajo. Medido en producción a 1920: la tarjeta mide 340 px dentro de una columna de 304 px (el nombre largo del líder no puede achicarse). | `before/benchmarks-ranking__en__1440__glass-dark.jpg` | **Arreglado** |
| V-2 | **P0** | Benchmarks, móvil 375: el gráfico de barras se sale del viewport (los valores quedan cortados y aparece scroll horizontal) con nombres de modelo largos. No estaba reportado: apareció al probar móvil. | `before/benchmarks-ranking__es__375__aqua.jpg` | **Arreglado** |
| V-3 | **P1** | Home: 11 secciones apiladas, 6.320 px de alto en desktop y 7.835 px en móvil; las acciones principales aparecen después de las noticias; links de recursos sueltos en el medio. | `before/home__en__1440__glass-dark.jpg` | **Arreglado** (1.826–1.873 px en desktop) |
| V-4 | **P1** | "Latest in AI Daily": la nota destacada se estira a la altura de la lista y deja medio card vacío. | `before/home-latest__en__1440__glass-dark.jpg` | **Arreglado** |
| V-5 | **P1** | La edición "week ahead" se etiqueta "Other" (y el resumen semanal "Digest"). | ídem | **Arreglado** |
| V-6 | **P1** | Header en móvil de las páginas internas: 8 links en 3 filas + controles ocupan ~150 px antes del contenido. | `before/analyzer-header__es__375__aqua.jpg` | **Arreglado** (una fila con menú colapsable) |
| V-7 | **P1** | El aviso de newsletter no aparece nunca en páginas cortas: se ocultaba siempre que el footer estuviera en pantalla, y en una página corta el footer está en pantalla desde el inicio. No estaba reportado. | medición en `/en/prompts` a 1440×900 | **Arreglado** |
| V-8 | **P1** | Con el almacenamiento del navegador bloqueado, `/analyzer` lanza `SecurityError` al cargar y ningún análisis puede enviarse (`getSessionId()` sin `try/catch`). No estaba reportado: lo encontró la prueba de degradación. | `scripts/release/qa-local.mjs` | **Arreglado** + test de regresión |
| V-9 | **P1** | El feed embebido de X no renderiza: `widgets.js` carga y crea un iframe de 0 px de alto; a los 9 s aparece el fallback. Reproducido en **producción** y en local, en el Chrome real. La causa está del lado de X (ver sección 6). | Chrome real, `/en` | **No arreglable desde el repo** — fallback verificado, texto del fallback corregido, decisión del dueño |
| V-10 | **P1** | El fondo animado casi no se percibe. Medido en producción: el blob más rápido se mueve 63 px (4,3 % del ancho) en 4 s y la escala varía 1,00–1,04. | `scripts/release/ambient-check.mjs` | **Arreglado** (166–174 px, ≈12 % en 4 s; escala 0,79–1,15) |
| V-11 | P2 | El footer muestra V1.7.3 estando 1.8.0 en producción. | `before/footer-version__en__1440__metro.jpg` | **Arreglado** (1.8.1) |
| V-12 | P2 | `<title>` de 132 y 129 caracteres en `/es|en/blog/weekly/2026-10-12` (el titular editorial usado tal cual). | `seo:check` | **Arreglado** (recorte en límite de palabra; la tarjeta social conserva el titular completo) |
| V-13 | P2 | El HTML de `/en/benchmarks` pesa 665–681 KB sin comprimir: 413 KB son las 1.296 filas de las 23 tablas serializadas como objetos completos. | medición sobre el HTML de producción | **Arreglado** (formato compacto: 107 KB para los mismos datos; ≈ −46 % del documento) |
| V-14 | P2 | `llms-full.txt`: 359 KB (en) / 387 KB (es), con una advertencia sin criterio en `seo:check`. | `seo:check` | **Resuelto** con un tope documentado de 400 KB que el generador aplica (sección 5) |
| V-15 | P2 | Botones `btn` sin variante (ni primario ni ghost) en 27 lugares: se ven como texto en negrita sin borde. | `/how-it-works`, `/guides`, `/models`, `/glossary`, artículo | **Arreglado** (pasan a `btn btn-ghost`) |
| V-16 | P2 | El prompt pegado en la home viajaba en la URL (`/analyzer?prompt=…`), es decir que podía quedar en historiales y logs de acceso, mientras la página dice que el texto no se guarda. | código de `HomePromptBox` | **Arreglado** (handoff por `sessionStorage`; la URL solo se usa si el almacenamiento está bloqueado o sin JS) |
| V-17 | P2 | Benchmarks, móvil: la categoría "Diseño" tiene 14 benchmarks en producción; apilados son ~1.100 px entre las pastillas y el gráfico. | medición sobre datos de producción | **Arreglado** (fila deslizable con snap en móvil) |
| A11Y-1 | P2 | Tema Aqua: la etiqueta blanca del botón primario sobre el azul del acento mide 4,02:1 (AA pide 4,5:1 para texto de 14 px). Preexistente y propio del acento aprobado del tema. | `scripts/release/a11y-check.mjs` | **Listado**, sin cambios: decisión del dueño |
| SEO-1 | P2 | 27 guías tienen `<title>` de entre 91 y 120 caracteres (Google corta alrededor de 60). Escritas a mano; no fallan `seo:check` (límite 120). | `seo:check` con límite 90 | **Listado** (ver sección 5) |
| SEC-1 | P2 | `npm audit --omit=dev`: 26 avisos (4 críticos) en dependencias, todos preexistentes en `main`. | `npm audit` | **Listado**, sin cambios (ver sección 6) |
| UX-1 | P2 | El video del recorrido es la grabación de la v1.7.0: muestra el hub viejo y el rótulo "v1.7.0". | `/how-it-works` | **Mitigado** (leyenda honesta, grabador actualizado); regrabación pendiente |

## 3. Matriz de pruebas

### 3.1 Layout y runtime — verificado

`node scripts/release/audit.mjs` sobre el build de producción local: **23 páginas × 5 anchos (1920, 1440, 1024, 768, 375) × Aqua claro, Glass claro, Glass oscuro, Metro = 460 cargas, 0 hallazgos**. Por carga comprueba: sin errores de consola ni de página, sin requests fallidos, sin desborde horizontal, CLS ≤ 0,1, exactamente un `<h1>` y a lo sumo un canonical.

Páginas: home (es/en), how-it-works (es/en), analyzer, best-ai, blog, blog/weekly, benchmarks, guides, una guía, models, glossary, prompts, prompts/code, una landing, library, share, about, methodology, changelog, privacy y un 404.

`node scripts/release/benchmarks-layout.mjs` (dev, con fixture): **30 comprobaciones (5 anchos × 6 categorías con 1, 2 y 14 benchmarks), 0 hallazgos**: ninguna tarjeta se solapa con el gráfico ni con otra, ninguna es más ancha que su lista, sin desborde, sin hueco entre el selector y el gráfico.

### 3.2 SEO — verificado en local

`npm run seo:check` contra el build local: **549 comprobaciones, 0 fallas, 0 advertencias** (robots, sitemap, llms, gemelos markdown, todas las URL del sitemap, proxy de idioma). Incluye las reglas nuevas: `/how-it-works` debe traer `HowTo`, `FAQPage` y `BreadcrumbList`; la home no debe declararlos y debe enlazar a `/how-it-works`.

Integración entre los tres PR de 1.8.0: un solo `<h1>` y un solo canonical por página (460 cargas), hreflang recíproco + `x-default`, JSON-LD con `@id` resueltos, `/library` y `/share` con `noindex` y las páginas clave sin él (`qa-local.mjs`).

No verificado (necesita internet público y propiedades verificadas): Rich Results Test, Schema Markup Validator, Search Console, Bing Webmaster Tools.

### 3.3 Motor — verificado en local (sin keys)

`node scripts/release/qa-local.mjs`: `POST /api/analyze` para los **8 propósitos × es/en (16 corridas)**. Todas devuelven puntaje 0–100, desglose en las seis dimensiones, `meta.optimizedScore`, prompt optimizado, `meta.refinement.execution.engine = "deterministic"` con `fallbackReason = "disabled"`, y **sin `meta.judge`** (`PROMPT_JUDGE_ENABLED` apagado). Mismo prompt, mismo puntaje. Un body inválido responde 4xx.

| Propósito | es antes → después | en antes → después | Tipo detectado |
| --- | --- | --- | --- |
| text | 57 → 57 | 57 → 57 | writing |
| study | 46 → 46 | 46 → 46 | study |
| code | 38 → 38 | 41 → 41 | coding |
| data | 66 → 69 | 66 → 69 | data_extraction |
| image | 40 → 64 | 40 → 64 | image |
| marketing | 41 → 41 | 41 → 41 | marketing |
| translation | 46 → 46 | 48 → 48 | translation |
| summarization | 56 → 56 | 56 → 56 | summarization |

En la UI (navegador integrado, 1440): un prompt de imagen muestra en `ScoreCard` "optimized: 67 (+27)" y en la Biblioteca "40 → 67 +27", guardado automático incluido.

**Observación (no es una regresión):** sin proveedor LLM el camino determinístico es liviano y en 6 de 8 propósitos el "después" es igual al "antes". Con keys en producción el refinador cambia eso; **no se verificó en producción** (no se corre `/api/analyze` contra producción).

### 3.4 Newsletter — verificado en local (sin suscribir)

Reglas puras con 23 tests nuevos (`lib/__tests__/newsletter.card.test.ts`) y comportamiento real en Chrome (`a11y-check.mjs`):

- nada aparece antes de 5 s; en la primera visita la tarjeta abre sola, completa y con el formulario;
- es un `role="dialog"` **no modal**: sin backdrop, sin bloqueo de scroll, **no toma el foco** (el foco sigue donde estaba);
- Esc y el botón Cerrar la colapsan a la pastilla; la pastilla la reabre y recién ahí el foco entra al formulario;
- segunda visita: solo la pastilla; suscripto: nada; cerrar la pastilla: oculta 7 días;
- home en desktop: con el formulario de la columna lateral en pantalla, la tarjeta flotante no se muestra;
- móvil: fila compacta de 64 px dentro del viewport y sin scroll horizontal; en el analizador móvil no abre sola y nada tapa el textarea.

El alta real (POST `/api/newsletter/subscribe`) **no se ejecutó**: la cubren los tests existentes con mocks (`newsletter.subscribe.spec.ts`, `newsletter.routes.spec.ts`).

### 3.5 Fondo animado — verificado

`node scripts/release/ambient-check.mjs` (ventana de 4 s, 1440×900; las filas de v1.8.1 son del build de producción local). El movimiento en una ventana de 4 s depende del punto del ciclo en que cae la medición: en otras corridas dio entre 96 y 174 px, siempre por encima de producción:

| Caso | Movimiento máx. | Escala | fps | Layouts | Long tasks | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| Producción v1.8.0, Aqua/Glass | 63 px (4,3–4,4 %) | 1,00–1,04 | 75 | 0 | 0 | 0 |
| v1.8.1 Aqua claro | 174 px (12,1 %) | 0,79–1,15 | 78 | 0 | 0 | 0 |
| v1.8.1 Glass claro | 166 px (11,6 %) | 0,80–1,14 | 79 | 0 | 0 | 0 |
| v1.8.1 Glass oscuro | 172 px (12,0 %) | 0,79–1,15 | 79 | 0 | 0 | 0 |
| v1.8.1 Metro | 0 (sin blobs) | — | 78 | 0 | 0 | 0 |
| v1.8.1 `prefers-reduced-motion` | 0 | 1,00 | 78 | 0 | 0 | 0 |

Solo `transform` y `opacity` en cinco capas propias; ninguna animación provoca layout. Las dos capturas separadas por 4 s (`after/ambient__*`) muestran el cambio a simple vista. No se tomó una traza de Performance en DevTools: las métricas equivalentes (fps por `requestAnimationFrame`, layouts y tiempo de hilo principal por CDP, long tasks y CLS por `PerformanceObserver`) salen del script.

### 3.6 Accesibilidad — verificado

`node scripts/release/a11y-check.mjs`: **77 comprobaciones, 0 fallas, 1 excepción conocida (A11Y-1)**.

- Menú colapsable (375 px, home e interna): botón con nombre, `aria-expanded`/`aria-controls`, abre con Enter, Tab entra a los 9 links, Esc cierra y devuelve el foco.
- Home en Aqua, Glass oscuro y Metro: un `<h1>`, `<html lang>` correcto, links del header, las dos acciones, "Cómo funciona" y el textarea alcanzables con Tab; **todos los controles enfocados pintan indicador de foco**; ningún link o botón sin nombre accesible.
- `/how-it-works` y `/benchmarks`: controles con nombre; los gráficos `role="img"` tienen nombre y descripción.
- Contraste (texto contra su fondo real, mezclando las superficies translúcidas sobre el canvas del tema) en 10 textos × 4 temas: todos ≥ 4,5:1 salvo A11Y-1.

No verificado: lector de pantalla real (NVDA/VoiceOver) y dispositivo táctil físico.

### 3.7 Degradación — verificado

- Sin Firestore, sin `OPENROUTER_API_KEY`, sin `GROQ_API_KEY`: es el build local de la sección 3.1 (460 cargas sin hallazgos). La home muestra las tarjetas simples de IA al Día y Benchmarks; benchmarks, su estado vacío honesto.
- Sin `NEXT_PUBLIC_X_HANDLE`: el card de X no se renderiza (test de `resolveXFeedSource`).
- **JavaScript deshabilitado** (9 páginas clave): 200, un `<h1>`, contenido y navegación presentes; la caja de la home es un formulario GET con el campo `prompt`.
- **`localStorage` y `sessionStorage` bloqueados** (lanzan al accederlos): las 9 páginas cargan sin errores, incluso pasados los 5 s del aviso de newsletter; la caja de la home cae a `?prompt=`. Acá apareció V-8.

### 3.8 Seguridad básica — verificado

- `/api/share/card` con parámetros válidos, ausentes, fuera de rango, no numéricos, con `<script>` y con un valor de 4.000 caracteres: siempre imagen o 4xx limpio, nunca 5xx, nunca refleja texto.
- `/{lang}/share` con `<script>` en los parámetros: 200, `noindex`, sin marcado reflejado.
- `NEXT_PUBLIC_X_LIST_ID` mal formado o con inyección: se ignora (nunca llega al embed).
- `npm audit`: ver SEC-1 y sección 6.

### 3.9 Rendimiento — verificado con las limitaciones que se indican

`node scripts/release/perf.mjs` (Chrome real; móvil = 375×812 con CPU ×4; red sin limitar). **Los tiempos (LCP) no son comparables** entre un servidor local y producción; sí lo son bytes de HTML, nodos del DOM, altura, CLS y tiempo de long tasks. El build local no tiene analytics ni contenido de blog/benchmarks, así que su JS es menor por ese motivo y no se presenta como mejora.

| Página | Métrica | Producción v1.8.0 | v1.8.1 local | Comparable |
| --- | --- | --- | --- | --- |
| Home desktop | alto de página | 6.320 px | 1.826 px (1.873 con contenido de ejemplo) | sí |
| Home móvil | alto de página | 7.835 px | 2.264 px (3.339 con contenido de ejemplo) | sí |
| Home | nodos DOM | 526 | 305 (≈430 con contenido de ejemplo, medido en dev) | sí |
| Home | HTML sin comprimir | 120 KB | 63 KB | parcial (sin notas) |
| Home | CLS | 0,002–0,004 | 0 | sí |
| Benchmarks | HTML sin comprimir | 665 KB | ≈ 360 KB estimado | calculado sobre los datos de producción: payload 413 → 107 KB |
| Todas | CLS | ≤ 0,015 | 0 | sí |
| Todas, móvil CPU ×4 | long tasks en carga | 319–483 ms | 78–129 ms | no (sin analytics ni datos en local) |

No hubo regresiones medibles. **No se corrió Lighthouse** (no está en el proyecto y no se agregaron dependencias); INP real requiere interacción de usuarios y no se midió.

## 4. Tests y comandos de cierre

| Comando | Resultado |
| --- | --- |
| `npm run lint` | sin errores |
| `npm run typecheck` | sin errores |
| `npm test` | **1.377 tests en 66 archivos, todos en verde** (1.302 al empezar; +75 de esta versión) |
| `npm run build` | OK |
| `npm run seo:check` | 549 / 549 |

## 5. Decisiones de SEO tomadas

- **`llms-full.txt`, tope de 400 KB.** El archivo existe para entrar de una sola vez en el contexto de un asistente. En prosa es/en son ~3,6–4 bytes por token: 400 KB ≈ 100–110 mil tokens, que entra en las ventanas de 200 mil tokens con margen para la pregunta y la respuesta. Por encima de eso deja de ser un documento de una sola lectura y corresponde usar los gemelos `.md` por página. La parte explicativa (≈290 KB en, ≈320 KB es; dos tercios son las guías) va siempre; IA al Día recibe lo que quede bajo el tope, nunca más de 60 KB. `seo:check` falla por encima del tope y un test falla si la parte explicativa sola queda a menos de 40 KB de él.
- **Títulos de ediciones semanales:** `<title>` recortado a 60 caracteres en límite de palabra con "…"; Open Graph y Twitter conservan el titular completo.
- **Límite de `<title>` en `seo:check`:** se dejó en 120. Bajarlo a 90 hace fallar 27 guías escritas a mano (SEO-1). Reescribir esos títulos es trabajo editorial, no de esta versión.
- **Home:** conserva `<title>`, descripción y `<h1>`. Su JSON-LD pasa a ser solo `WebPage`: el `HowTo` y el `FAQPage` se mudaron con su texto visible a `/how-it-works`, porque el JSON-LD debe describir lo que la página muestra.

## 6. Lo que no se pudo verificar o queda en manos del dueño

1. **Feed de X (V-9).** El embed oficial no renderiza para `@promptea_me` ni en producción ni en local: el iframe queda en 0 px. No se puede determinar la causa desde afuera (X viene restringiendo los timelines embebidos; también puede depender de la cuenta). El card queda listo: fachada click-to-load, altura fija sin CLS, fallback con link al perfil, y fuente configurable por variables (`NEXT_PUBLIC_X_HANDLE`, y `NEXT_PUBLIC_X_LIST_ID` para una lista). Hace falta que el dueño confirme si en su sesión de X el timeline embebido se ve, o que pase la información con la que quiere cargarlo.
2. **Motor con LLM en producción**: failover de proveedores, puntaje "después" con refinador y juez opcional. Solo se verificó el camino determinístico.
3. **Alta real al newsletter** y envío de emails.
4. **Validadores externos**: Rich Results, Schema Markup Validator, Search Console, Bing, envío del sitemap.
5. **Video del recorrido**: no se regrabó. Una grabación fiel necesita las variables de producción para tener contenido real, y el grabador ejecuta un análisis real, que escribe telemetría. El grabador ya está actualizado para la home nueva.
6. **Dependencias (SEC-1).** `npm audit fix` sin `--force` baja de 26 a 11 avisos, pero al probarlo dejó la instalación sin el binario nativo de `lightningcss` (el build de CSS dejó de funcionar hasta reinstalar), así que **se revirtió** y no forma parte de esta versión. Quedan además Next 16.1.1 → 16.4.6 (crítico: DoS del optimizador de imágenes en instalaciones self-hosted; Promptea corre en Vercel) y `firebase-admin` 13 → 14 (mayor). Conviene hacerlo en un PR propio, con `npm ci` limpio y deploy de preview.
7. **Lector de pantalla y táctil reales**, y Lighthouse.
8. **Contraste del botón primario en Aqua (A11Y-1)**: oscurecer el acento a ~`#0071e3` lo llevaría a 4,6:1, pero cambia el color de marca del tema.

## 7. Cómo repetir

```bash
npm run build && npx next start -p 3182
BASE_URL=http://localhost:3182 npm run seo:check
node scripts/release/audit.mjs --base=http://localhost:3182
node scripts/release/perf.mjs --base=http://localhost:3182
node scripts/release/ambient-check.mjs --base=http://localhost:3182

# con contenido de ejemplo (solo desarrollo):
BENCHMARKS_DEV_FIXTURE=1 BLOG_DEV_FIXTURE=1 NEXT_PUBLIC_X_HANDLE=promptea_me npx next dev -p 3181
node scripts/release/benchmarks-layout.mjs --base=http://localhost:3181
node scripts/release/a11y-check.mjs --base=http://localhost:3181
node scripts/release/qa-local.mjs --base=http://localhost:3181
node scripts/release/capture.mjs --base=http://localhost:3181 --out=docs/release/v1.8.1/after --set=after
```
