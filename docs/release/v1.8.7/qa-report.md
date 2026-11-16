# Promptea v1.8.7 (parte A) — QA e informe

Fecha: 2026-11-16 · Rama: `claude/v187-x-newsletter-benchmarks` (PR #48) · Base: `main` @ `663e192` (v1.8.6, #43–#47).

Severidades: **P0** rompe, seguridad o datos · **P1** funcionalidad o experiencia importante · **P2** pulido.

## 1. Resumen

| Bloque | Estado |
| --- | --- |
| A1. Feed de X propio, sin Elfsight | **Hecho.** Tarjeta de servidor, fuente Buffer → oEmbed → CTA, saneamiento y tests. **Necesita tu clave de Buffer** para mostrar posts; sin ella muestra el CTA. Decisión: [`x-feed-decision.md`](./x-feed-decision.md) |
| A2. Orden de tarjetas + aviso de newsletter a los 5 s | **Hecho.** Causa encontrada y reproducida en producción; reglas nuevas con tests y Chrome real |
| A3. Benchmarks: análisis y comparación por modelo | **Hecho.** Panel, comparación y vista rápida de frontera. Sin ruta por modelo: [`benchmarks-model-routes.md`](./benchmarks-model-routes.md) |
| A4. QA | **Hecho.** 10 hallazgos: 0 P0, 4 P1, 6 P2. **5 arreglados** en este PR, **3 abiertos que dependen de vos** y **2 informativos** sin cambios |

Antes de tocar nada, `main` estaba en verde: lint, typecheck, 1.801 tests, build y `seo:check` local 870/870.

## 2. Hallazgos

| # | Sev. | Hallazgo | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| Q-1 | **P1** | **El aviso "Unite a nuestro newsletter" se veía una sola vez por navegador.** v1.8.1 lo abría solo "en la primera visita": después de aparecer una vez, aunque nadie lo cerrara, cada visita mostraba solo la pastilla. En AI Daily no aparecía nunca. Por eso vos no lo veías. Reproducido en producción con un Chrome limpio (tarjeta a los 5 s) y con uno que ya la había visto (solo pastilla, en las 8 páginas × 2 anchos). | [`logs/newsletter-before-prod.txt`](./logs/newsletter-before-prod.txt), [`logs/newsletter-before-local.txt`](./logs/newsletter-before-local.txt) | **Arreglado.** Reglas nuevas en `lib/newsletter/prompts.ts`: abre para quien no dijo que no; cerrarla la pausa 7 días; suscripto = nunca. Detalle en el README. Tests: `newsletter.card` (31), `newsletter.prompts` (14). Después: [`logs/newsletter-after-local.txt`](./logs/newsletter-after-local.txt) |
| Q-2 | **P1** | **El feed de X dependía del plan gratis de Elfsight** (141/200 vistas del mes al 16/11, se corta al llegar a 200). Además cargaba ~165 KB de JavaScript de terceros, no era rastreable ni funcionaba sin JavaScript. | panel de Elfsight (Chrome, solo lectura); [`x-feed-decision.md`](./x-feed-decision.md) | **Arreglado** (A1). Ningún rastro de Elfsight en código, estilos, config ni scripts (test `xfeed`). |
| Q-3 | P2 | **La tarjeta tapaba controles.** En producción, a 1440×900 en la home pisaba el cuadro del prompt y su botón "Analizar prompt". A 375 px tapaba el textarea, y en `/benchmarks` los botones Top N. | `newsletter-before-*` (columna `COVERS`) | **Arreglado.** La tarjeta mide lo que tiene debajo: completa si la esquina está libre, fila compacta si solo entra esa, y si no, espera al scroll. En analyzer/best-ai se repliega al escribir. En celulares no tapa ningún control. **Queda a propósito**: en escritorio la tarjeta completa puede tapar botones secundarios (los Top N de `/benchmarks`); no bloquea y se cierra con Esc. |
| Q-4 | P2 | **AI Daily en celular tenía dos superficies abajo** (la barra del dock y, con las reglas nuevas, la tarjeta). | código | **Arreglado.** La barra móvil del dock se va y la tarjeta la reemplaza. El dock de escritorio queda como formulario en página. |
| Q-5 | P2 | **Herramientas de QA atadas a Elfsight.** `xfeed-check.mjs` auditaba el widget y `ambient-check.mjs` lo filtraba. | scripts | **Arreglado.** `xfeed-check` reescrito para el feed nuevo (sin pedidos a X ni a terceros, enlaces seguros, altura fija, estado vacío, orden, sin JS). Scripts nuevos o extendidos: `newsletter-check.mjs`, `benchmarks-layout.mjs` (panel y comparación). |
| Q-6 | **P1** | **IndexNow sin clave**: `/indexnow-key.txt` responde 404, así que el workflow de IndexNow sale sin enviar nada. | [`logs/prod-checks.txt`](./logs/prod-checks.txt) | **Abierto: falta tu paso** (sección 6, punto 2). |
| Q-7 | **P1** | **`npm audit --omit=dev`: 18 avisos (3 críticos, 5 altos)**, todos transitivos de `firebase-admin` 13 (`protobufjs`, `node-forge`, `fast-xml-parser`, `@grpc/grpc-js`…) más `source-map-js` (de postcss/Next). Es el mismo conjunto que en v1.8.5. | [`logs/npm-audit-prod.json`](./logs/npm-audit-prod.json) | **Abierto: decisión tuya.** Arreglarlo pide `firebase-admin` 14 (versión mayor), que va en un PR propio con prueba de Firestore. No se corrió `npm audit fix`, que rompe `lightningcss`. |
| Q-8 | P2 | **N-1 (conocido)**: contraste del texto y de los badges de acento en Metro (3,54 / 2,96) y del badge en Glass claro (4,4). | [`logs/a11y-check.txt`](./logs/a11y-check.txt) | **Abierto: decisión de identidad tuya.** No se cambió, como pediste. |
| Q-9 | P2 | `/en/analyzer`, `/es/blog` y `/en/blog/tech` responden `x-vercel-cache: MISS` en cada pedido. | `logs/prod-checks.txt` | **Informativo, por diseño**: el analizador lee `searchParams` para el prompt precargado y el blog para los filtros por GET. El resto de las páginas sale de caché (`HIT`). |
| Q-10 | P2 | `llms-full.txt` en español pesa 383.370 bytes, contra un tope de 409.600. | `logs/prod-checks.txt` | **Informativo.** Bajó desde v1.8.4 (393.855) y el generador recorta AI Daily antes de pasarse. |

## 3. Matriz de pruebas

| Área | Qué | Cómo | Resultado |
| --- | --- | --- | --- |
| Salud de producción | Errores de runtime de Next 16.4.6 | Vercel `get_runtime_errors`, 7 días, solo lectura | **0 errores** |
| Caché/ISR | `x-vercel-cache`, `age`, headers de seguridad, sin `x-powered-by` | `curl` GET dos veces por página (`logs/prod-checks.txt`) | Páginas estáticas en `HIT`. `/en` revalida cada ~5 min y `/pt/guides` tiene 41 h de edad; las dinámicas por diseño, en Q-9. `nosniff` y `SAMEORIGIN` presentes, sin `x-powered-by` |
| SEO/GEO producción | Sitemap, hreflang, canonical, JSON-LD, `llms*.txt`, gemelos `.md` | `BASE_URL=https://www.promptea.me npm run seo:check` | **1.193/1.193**, 0 avisos (`logs/seo-check-prod.txt`) |
| SEO local | Lo mismo sobre el build de este PR, sin credenciales | `seo:check` contra `next start` | **870/870** (`logs/seo-check-local.txt`) |
| #47 SEO EE. UU./Asia | FAQ del analizador, modelos chinos, guías nuevas, IndexNow | `curl` | FAQPage en `/en/analyzer`; `/models/{qwen,glm,minimax,doubao}` 200 en es/en/pt; las 4 guías nuevas 200; clave de IndexNow 404 (Q-6) |
| AI Daily Tech | Notas reales, `noindex` solo si está vacía, RSS, `llms.txt`, sitemap | `curl` | Hay notas: `index, follow` en es/en/pt, 1 ítem en el feed es/en (el de `/pt` redirige 308 al inglés), presente en `llms.txt` y en el sitemap (2 URLs) |
| #46 medición limpia | Eventos de Vercel Analytics: una vez, sin PII | Build local con `window.va` interceptado (no se envía nada) y un flujo real: cambiar IA, analizar, copiar (`logs/vercel-analytics-events-local.txt`) | `Target Changed`, `Prompt Analyzed` y `Prompt Copied`: **1 vez cada uno**, con solo `{ lang, target }`. Con automatización detectada no sale nada (`isAutomatedBrowser`). En el dashboard, 30 días: `Prompt Analyzed` 7 visitantes / 12 eventos, `Target Changed` 6 / 8 |
| #45 portugués | `<html lang>`, títulos | `curl` | `pt-BR` y títulos en portugués en `/pt`, `/pt/analyzer`, `/pt/how-it-works` y `/pt/guides` |
| Feed de X nuevo | Sin pedidos a X ni terceros, enlaces `https` con `rel` seguro, altura fija, estado vacío, orden, sin JS, 3 temas | `xfeed-check.mjs` sobre el build (sin clave: estado vacío) y sobre dev con fixture (posts) | Ver fila siguiente |
| Feed de X (resultado) | — | — | Build: **105/108**. Los 3 fallos eran del propio script, que marcaba al visitante como suscripto y así ocultaba el dock; corregido y repetido: **108/108** (`logs/xfeed-check-local.txt`). Dev con fixture: 6 posts, 420 px fijos, newsletter arriba (capturas `shots/xfeed-*`) |
| Aviso de newsletter | Páginas × anchos × perfiles (limpio, ya visto, cerrado hace 2 y 8 días, suscripto); tapa controles; foco; analizador con resultados | `newsletter-check.mjs` (dev y build), `analyzer-flow` | Ver Q-1 y Q-3. Build sin datos (`logs/newsletter-check-build.txt`): perfil limpio → tarjeta en analyzer, guías, how-it-works y benchmarks (fila compacta en celular, o después del primer scroll si hay un control debajo); cerrada → pastilla; suscripto → nada en las 12 combinaciones. En la home y en `/en/blog` sin datos, el formulario de la página o el pie quedan en la esquina y la tarjeta espera, como corresponde |
| Benchmarks por modelo | Números del panel = tabla = fuente | Índice construido sobre el snapshot **real** de producción (tablas extraídas del HTML de `/es/benchmarks` y de `/api/benchmarks`, solo GET) | **1.301 filas iguales**, 23 benchmarks, 224 modelos; líderes y conteos iguales a `/api/benchmarks`; los 20 de frontera, iguales (`logs/benchmarks-prod-model-index.txt`) |
| Benchmarks: layout y teclado | 5 anchos × 6 categorías; panel dentro del viewport con foco atrapado, Esc devuelve el foco; barra y diálogo de comparación | `benchmarks-layout.mjs` (dev con fixture) | **45 chequeos, 0 hallazgos** (`logs/benchmarks-layout-dev.txt`). Más un flujo de teclado: Enter abre el panel, 25 Tab siguen adentro, `#m=` abre al cargar, 0 errores de consola |
| Accesibilidad | Teclado, foco, nombres, contraste, tarjeta de newsletter | `a11y-check.mjs` sobre el build | **83/83**; 3 "known" de N-1 (Q-8) |
| Auditoría visual | Páginas × anchos × temas: desborde, CLS, un `<h1>`, un canonical, errores de consola | `audit.mjs --quick` sobre el build | **46 cargas, 0 hallazgos** (`logs/audit.txt`) |
| Idiomas | Páginas × es/en/pt × 1440/375, textos cortados, selector, cadenas sin traducir en `/pt` | `i18n-qa.mjs` sobre el build | **198 cargas, 0 fallas** (`logs/i18n-qa.txt`) |
| QA local | Motor sin claves, tarjeta compartible con parámetros hostiles, `noindex`, sin JS, almacenamiento bloqueado, home → analizador | `qa-local.mjs` | **57/57** |
| Motor | 8 propósitos × es/en/pt, idempotencia, mismo prompt desde las tres interfaces | `engine-qa.mjs` (local) | **64/64** |
| Rendimiento | LCP, CLS, long tasks y bytes en escritorio y en móvil (CPU ×4) | `perf.mjs` sobre el build | CLS 0 (0,001 en una guía); LCP 0,13–0,66 s en escritorio y 0,28–0,71 s en móvil (`logs/perf.txt`). Sin datos de benchmarks: el tablero no se midió con datos reales |
| Degradación | Sin Firestore, OpenRouter, Buffer ni X | El build local corre sin credenciales | Feed de X: CTA. Benchmarks: estado vacío honesto. AI Daily: vacío digno. Sin errores |

## 4. Qué se escribió afuera del repo

- **GitHub**: PR #48 en borrador, con pushes por fase.
- **Producción (promptea.me)**: solo GET (`curl`, `seo:check`, `newsletter-check`, `prod-checks`). Los scripts con Chrome contra producción abortan todo pedido que no sea GET, así que no salió telemetría ni hubo altas, feedback, análisis ni publicaciones.
- **Chrome del dueño, solo lectura**:
  - Buffer: Settings → API (página de claves, sin crear ninguna);
  - Elfsight: Billing y My Apps;
  - docs.x.com: precios de la API, sin crear app ni clave;
  - Vercel Analytics: filtros por país.
- **Buffer API (integración MCP)**: `get_account`, `list_channels`, `list_posts` (enviados, 5) y `get_post`, todo lectura. Esas llamadas cuentan contra el cupo mensual compartido (72/1.000 al 16/11).

## 5. Lo que no se pudo verificar

1. **El feed con posts reales de Buffer**: hace falta tu `BUFFER_API_KEY`. El parser se probó con la forma real de los posts de Buffer (leída por la integración) y el GraphQL con la consulta documentada, pero no contra la API con clave. Primer paso después de cargarla: mirar el preview.
2. **El preview de Vercel de #48**: está protegido; se verificó el build local.
3. **El tablero de benchmarks con datos reales en el navegador**: el build local no tiene `OPENROUTER_API_KEY`. Las cuentas del panel sí se verificaron sobre el snapshot real (fila "Benchmarks por modelo").
4. **Un alta real al newsletter**: endpoint con mock en local, nunca en producción.
5. **Lector de pantalla real, dispositivo físico e INP.**

## 6. Qué falta de tu lado

En orden de prioridad:

1. **Clave de Buffer para el feed de X** (pestaña abierta): publish.buffer.com → Settings → API → **Personal Access → + New Key**. Después, en Vercel → promptea → Settings → Environment Variables: `BUFFER_API_KEY` = la clave (Production y Preview, *Sensitive*). Va junto con el redeploy del paso 2.
2. **`INDEXNOW_KEY`** (Q-6, pestaña de Vercel abierta): generá una clave, por ejemplo con `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`. Cargala como `INDEXNOW_KEY` (Production) y **redeployá**. Después, `https://www.promptea.me/indexnow-key.txt` tiene que devolver la clave.
3. **Elfsight** (pestaña abierta): no hay suscripción paga que cancelar (plan gratis). Cuando la v1.8.7 esté en producción, borrá el widget "Untitled Twitter Feed" en My Apps.
4. **Medir Search Console hacia el 12/12** con la tabla de [`../v1.8.6/seo-report.md`](../v1.8.6/seo-report.md) §4. La propiedad está en la cuenta `u/5` de Search Console.
5. **`firebase-admin` 14** (Q-7): decidir si se hace el salto de versión mayor en un PR propio, para cerrar los 3 críticos transitivos.
6. **N-1** (Q-8): decidir si Metro y Glass claro usan su tono "strong" en el texto de acento y los badges.
7. **Newsletter de `/pt` y de `/zh`**: hoy un suscriptor de `/pt` elige la edición en inglés o en español. Para zh, ver la parte B (#49).
8. **Política de bots de entrenamiento** (`lib/seo/crawlers.ts`, hoy permite todos).
9. **Variables opcionales de Vercel**: `ANTHROPIC_API_KEY` (Claude como refinador de respaldo), `REFINER_PROVIDERS`, `PROMPT_JUDGE_ENABLED=1`.
10. **Revisión nativa del pt** ([`../../i18n/pt-review.md`](../../i18n/pt-review.md)) y, con la parte B, del zh.
11. **Decisiones que siguen abiertas**: `/api/analyze-llm` (integrarlo o borrarlo), un límite de uso compartido (Redis) y CSP en `Report-Only`.

Un dato del dashboard para tener en cuenta: con la medición limpia, en 30 días solo 7 visitantes generaron `Prompt Analyzed`, sobre 1.274 visitantes. El 80 % rebota.

## 7. Cómo repetir

```bash
npm run build && npx next start -p 3191
BASE_URL=http://localhost:3191 npm run seo:check
node scripts/release/xfeed-check.mjs --base=http://localhost:3191
node scripts/release/newsletter-check.mjs --base=http://localhost:3191 --mock-subscribe
node scripts/release/a11y-check.mjs --base=http://localhost:3191
# Con datos de fixture (dev): BENCHMARKS_DEV_FIXTURE=1 BLOG_DEV_FIXTURE=1 X_FEED_DEV_FIXTURE=1 NEXT_PUBLIC_X_HANDLE=promptea_me npx next dev -p 3181
node scripts/release/benchmarks-layout.mjs --base=http://localhost:3181 --lang=es
```
