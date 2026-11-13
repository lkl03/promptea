# Promptea v1.8.4 — QA final después de v1.8.3

Fecha: 2026-11-13 · Rama: `v1.8.4-qa` · Base: `main` @ `c5f7a84` (v1.8.3: #39 + #40).

Este documento dice **qué se hizo, qué se probó, cómo y con qué resultado**, lista los hallazgos por severidad con su estado, y separa lo verificado de lo que no se pudo verificar. Salidas de cada corrida en [`logs/`](./logs), capturas en [`shots/`](./shots).

Severidades: **P0** rompe, seguridad o datos · **P1** funcionalidad o experiencia importante · **P2** pulido.

## 1. Resumen

- **Mergeados** [#39](https://github.com/lkl03/promptea/pull/39) (QA) y [#40](https://github.com/lkl03/promptea/pull/40) (AI Daily Tech, rebasado sobre `main` y reapuntado). Producción sirve 1.8.3 desde el 2026-11-13.
- **Cerrado sin mergear** [#41](https://github.com/lkl03/promptea/pull/41) (bot semanal), rama `chore/weekly-update-v1.8.3` borrada. Cabeza: `23181558db9632a6f8346786d273fd5fb6fe5192`.
- **Rutina "Weekly Promptea update" pausada** (`trig_017JHGJRFJpaA67FXq1BFsnJ`, `enabled: false`, verificado con otro `get`). No se tocó ninguna otra rutina.
- **QA independiente**: 11 hallazgos, 0 P0, 2 P1, 9 P2. **6 arreglados** en este PR (entre ellos un P1, `zod`), **3 abiertos** con decisión del dueño (entre ellos el otro P1, `next`) y **2 descartados** al medir de nuevo. Además se descartaron 3 sospechas heredadas (sección 3.1).
- Cierre: `lint`, `typecheck`, `npm test` (**1.696 tests**, 1.678 al empezar), `build`, `seo:check` local (793/793) y contra producción (1.111/1.111), en verde.
- No se agregaron funciones.

## 2. Qué se mergeó y qué se cerró

| Paso | Cómo | Verificado |
| --- | --- | --- |
| #39 → `main` | Vercel en verde, `mergeable` CLEAN, sin P0 abierto en su informe. Squash (`a9fa4a1`). | El árbol de `a9fa4a1` es idéntico al de la punta de `v1.8.3-qa`. En producción aparecen los headers nuevos de Q-13 (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) y `/en` sale de caché (`x-vercel-cache: HIT`, TTFB 0,39 s). |
| #40 → `main` | `git rebase --onto origin/main cbeff83` (3 commits, sin conflictos), `--force-with-lease` sobre la cabeza esperada, base cambiada a `main`. Diff del PR: 76 archivos, solo Tech + release. Vercel en verde. Squash (`c5f7a84`). | El árbol rebasado es **idéntico byte a byte** al que pasó `lint`, `typecheck`, `npm test` (1.678), `build` y `seo:check` (795/795) antes de mergear; el de `main` después del merge también. En producción: footer y `lib/version.ts` en 1.8.3; `/{es,en,pt}/blog/tech`, `/{es,en,pt}/sources`, `/en/llms.txt` y `/en/blog/tech/feed.xml` en 200. |
| #41 cerrado | Diff leído; comentario de cierre con el motivo y el SHA de la cabeza; `gh pr close --delete-branch`. | `git ls-remote origin chore/weekly-update-v1.8.3` vacío; el commit sigue disponible (`git fetch origin pull/41/head`). |
| Rutina pausada | `RemoteTrigger get` (nombre confirmado), `update {enabled: false}`, `get` de nuevo. | `enabled: false`. Próxima corrida que habría tenido: 2026-11-19 04:08 UTC. |

**Rescatado de #41:** solo el fix de accesibilidad, reescrito (sección 3, F-1). **No portado:** las dos guías nuevas (`ai-prompts-for-customer-feedback`, `ai-prompts-for-proposals`): es contenido y queda como decisión del dueño.

## 3. Hallazgos

| ID | Sev. | Hallazgo | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| F-1 | P2 | **Las cajas `<pre>` con scroll no se podían enfocar ni desplazar con el teclado** (WCAG 2.1.1, axe `scrollable-region-focusable`) en guías, modelos, glosario y, como avisaba el bot, en los seis packs `/{lang}/prompts/*`. | código; cuerpo de #41 | **Arreglado** en las 9 páginas: `tabIndex={0}`, `role="group"` (en el rol genérico de `<pre>` `aria-label*` está prohibido) y `aria-labelledby` al título visible de la tarjeta, así el nombre sale en el idioma de la página sin strings nuevos. El bot usaba textos inline en `pick()`; no se copiaron. Test: `a11y.scrollableTemplates.test.ts` (10 casos; falla si una caja con scroll pierde el foco o el nombre, o si el id referido no existe). |
| F-2 | P2 | **`/blog/tech` con 0 notas se ofrecía a los buscadores**: `index, follow` en es/en/pt, en el sitemap (es, en) y en `llms.txt`. Una página de listado vacía. | `curl` a producción | **Arreglado**: `noindex, follow` y fuera del sitemap y de `llms.txt` mientras no haya notas tech; vuelve sola con la primera (`withoutEmptySectionIndexes`). La página, el feed RSS (200, canal válido sin ítems) y las pestañas siguen igual. Verificado en los dos estados: build sin datos → noindex, 0 en sitemap y `llms.txt`; dev con fixture → `index, follow`, en sitemap y `llms.txt`. Tests: `blog.techEmptyIndex.test.ts` (incluye la base caída) y casos en `seo.tech`, `seo.sitemap`, `seo.llms`. |
| F-3 | **P1** | **`npm audit --omit=dev`: 26 avisos (4 críticos)**, el mismo conjunto que Q-6 de v1.8.3. Directas: `next` 16.1.1 (crítico; arreglado en 16.4.1+), `zod` < 4.6.6 (alto), `resend` (moderado), `firebase-admin` (moderado, solo con salto de mayor). | `logs/npm-audit-prod.json` | **`zod` arreglado** (F-4). **`next` abierto — decisión del dueño**: 16.4.6 se publicó el 2026-11-09 (4 días antes de este QA) y cruza tres minors del framework; no se mezcla con un PR de QA. **`resend` abierto**: es la librería que envía el newsletter a suscriptores reales y acá no se puede probar un envío. |
| F-4 | **P1** | `zod` 4.3.5 con aviso alto. | `logs/npm-audit-prod.json` | **Arreglado**: `^4.6.7` (minor; publicado hace un mes). Suite completa, build y `seo:check` en verde con la versión nueva. Quedan 25 avisos. |
| F-5 | P2 | **Registro de modelos desactualizado**: Anthropic lanzó Claude Fable 5.2 (09-11) y Google Gemini 4 Argon y Gemini 4 Carbon; ninguno estaba en `lib/models.ts`. La nota de Gemini 3.1 Pro decía "no hay un Pro más nuevo". | documentación oficial (abajo) | **Arreglado**: `claude-fable-5.2` seleccionable (Fable 5.1 → legacy con `replacementId`, siguiendo la convención del registro aunque Anthropic lo siga sirviendo; Fable 5 apunta directo a 5.2); `gemini-4-argon` y `gemini-4-carbon` seleccionables, sin cambiar el default de Gemini; nota de 3.1 Pro corregida. `verifiedAt: 2026-11-13`. **GPT-6 Astra Pro no se agregó**: `developers.openai.com/api/docs/models/gpt-6-astra-pro` responde 404 y solo lo listan catálogos de terceros. |
| F-6 | P2 | **README sin dos variables** que lee el código: `TELEMETRY_TTL_DAYS` y `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. | `grep process.env` contra el README | **Arreglado**. |
| F-7 | P2 | **Q-16 sigue**: en Aqua (tema por defecto) la etiqueta del botón primario mide 4,02:1 (AA pide 4,5:1). | `logs/a11y-check.txt` | **Abierto — decisión del dueño**. Propuesta concreta: usar `--accent-strong` (`#0061cc`, ya definido en Aqua) como fondo del botón primario da ≈ 5,9:1. Cambia el azul de marca del botón. |
| F-8 | P2 | **Q-17 sigue**: `llms-full.txt` en español mide 393.855 bytes contra el tope de 409.600 (en: 367.437; pt: 342.303). | `curl` a producción | **Abierto**. No se rompe: el generador recorta IA al Día antes de pasarse. Los 27 títulos largos de guías son trabajo editorial. |
| F-9 | P2 | **El script de QA del feed de X fallaba solo contra producción.** `xfeed-check.mjs` aborta todo request que no sea GET fuera de localhost, y Elfsight manda un preflight CORS (`OPTIONS`) antes de cada pedido a su servicio de datos: el widget mostraba su propio error ("Failed to fetch user data / timeline data") en cada corrida contra producción y parecía una caída de Elfsight. Probablemente es también lo que vio la corrida headless de Q-2 en v1.8.3. | `logs/xfeed-prod-{en,pt}.*` (antes), `logs/xfeed-prod-en-run2.*` (después) | **Arreglado** (herramienta de QA): el filtro deja pasar los `OPTIONS`, que no escriben nada. Con el script corregido, en producción el card muestra **publicaciones reales** en desktop, 375 px, Glass oscuro y Metro oscuro, y cae al fallback traducido solo cuando corresponde (bloqueado, servicio de datos caído, sin JS): 19/19. Nada se pide a Elfsight antes del `load`; CLS ≤ 0,0021. |
| F-10 | P2 | Mobile `/en/analyzer`: una primera medición contra producción dio LCP 2,6 s y 1,96 s de long tasks. | `logs/perf-prod.txt` | **Descartado**: tres repeticiones dan LCP 0,8–1,2 s y 336–650 ms de long tasks (`logs/perf-prod-analyzer-repeat.txt`). Fue la primera carga en frío. |
| F-11 | P2 | La auditoría visual marcó errores de consola en `/pt/nao-existe`. | `logs/audit.txt` | **Descartado**: es el 404 del propio documento en la página 404. El script lo ignora cuando la ruta contiene "no-existe"; la ruta en portugués no lo contiene. |

Fuentes de F-5: [Claude Fable 5.2](https://platform.claude.com/docs/en/models/fable-5-2/overview), [deprecaciones de Anthropic](https://platform.claude.com/docs/en/about-claude/model-deprecations), [Prompting Claude Fable 5.2](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2), [Gemini 4 Argon](https://aistudio.google.com/docs/models/gemini-4-argon), [Gemini 4 Carbon](https://aistudio.google.com/docs/models/gemini-4-carbon), [Novedades de Gemini 4 Carbon](https://aistudio.google.com/docs/whats-new-gemini-4-carbon), [model card de Gemini 4 Carbon](https://deepmind.google/models/model-cards/gemini-4-carbon/).

### 3.1 Sospechas verificadas y descartadas

- **Error de runtime en Vercel** (`RangeError: Incorrect locale information provided` en el proxy, 2 apariciones en 7 días, la última el 06-11): ya estaba arreglado en `main` (try/catch alrededor del matcher de idioma en `proxy.ts`). 7 `Accept-Language` hostiles (`*`, `en_US`, basura, `q` inválido, solo dígitos) contra producción: todos 307 a `/en`, ningún 500.
- **"Intermitencia" de los gemelos `.md` de notas del blog**: no se reproduce. 12 notas × 8 rondas = 96 GET, 96 × 200 (`logs/md-twins-prod.txt`); además entran en el 1.111/1.111 de `seo:check`.
- **`/share` con `?s=<img src=x onerror=…>`**: el valor aparece en el HTML solo dentro del payload RSC de Next, como string JSON con `<` y `>` escapados (`<`). No hay markup reflejado (`logs/security-prod.txt`).

## 4. Matriz de pruebas

| Área | Qué | Cómo | Resultado |
| --- | --- | --- | --- |
| Salud del deploy | Versión, páginas clave en es/en/pt, errores de runtime | `curl`; Vercel (`get_runtime_errors` 7 días, `get_runtime_logs` 1 hora, solo lectura) | 1.8.3 en producción; páginas clave 200; 0 errores ni avisos en la última hora; el único grupo de errores de 7 días es el del proxy, ya arreglado |
| SEO/GEO | Sitemap, hreflang recíproco, canonical, JSON-LD, `llms.txt`/`llms-full.txt`/gemelos `.md`, `noindex` | `BASE_URL=https://www.promptea.me npm run seo:check` | **1.111/1.111**, 0 avisos (`logs/seo-check-prod.txt`) |
| SEO local | Lo mismo sobre el build de este PR | `seo:check` contra `next start` | **793/793** (795 en v1.8.3 menos `/es` y `/en/blog/tech`, que sin notas ya no están en el sitemap) |
| AI Daily Tech vacía | Estado vacío, `noindex`, sitemap, `llms.txt`, RSS | `curl` a producción y al build; dev con fixture | F-2. Feed `application/rss+xml` válido sin ítems. Con fixture: notas, filtros y paginación en `sweep` sin hallazgos |
| AI Daily y semanal | Notas reales, feeds, vistas `/pt` | `seo:check` producción (incluye las vistas `/pt/blog`, `/pt/blog/tech`, `/pt/blog/weekly` y las redirecciones de feeds) | en verde |
| Tres idiomas, anchos y temas | 23 páginas × es/en/pt × 1440/768/375, home y analizador en 3 temas × claro/oscuro, flujo del analizador en pt | `i18n-qa.mjs` sobre dev con fixtures | **297 cargas, 0 fallas** (capturas `shots/i18n__*`) |
| Auditoría visual | 29 páginas (es/en/pt, incluidas `/blog/tech`, `/sources`, packs, share, changelog, 404) × 1920/1440/1024/768/375 × Aqua claro, Glass claro, Glass oscuro, Metro | `audit.mjs` sobre el build | **580 cargas**: 0 desbordes horizontales, CLS sin hallazgos, 0 errores fuera de F-11 |
| Packs y Tech | 6 packs + Tech, sources, weekly, `/pt/blog` × 3 anchos | `sweep.mjs` sobre dev | **87 cargas, 0 hallazgos** |
| Motor | 8 propósitos × prompt real en pt/es/en, idempotencia, mismo prompt desde las tres interfaces | `engine-qa.mjs` (local, nunca producción) | **64/64** |
| Accesibilidad | Teclado, foco, nombres, contraste, tarjeta de newsletter (abre a los 5 s sin robar foco, no modal, Esc) | `a11y-check.mjs` | **77/77**, una excepción conocida (F-7) |
| QA local | Motor sin keys (camino determinístico), tarjeta compartible con parámetros hostiles, `noindex` de `/library` y `/share`, sin JS, `localStorage`/`sessionStorage` que tiran | `qa-local.mjs` sobre el build | **57/57** |
| Fondo animado | Movimiento perceptible, costo, Metro sin blobs, `prefers-reduced-motion` | `ambient-check.mjs` | 0 hallazgos; 0 layouts y 0 long tasks; quieto con reduced motion |
| Benchmarks | Layout con datos reales, 5 anchos × 6 categorías, pt y es | `benchmarks-layout.mjs` contra producción (solo GET) | **60 comprobaciones, 0 hallazgos**. `/api/benchmarks`: `live`, 0 filas inválidas, 23 benchmarks, 20 frontera |
| Feed de X | Cuándo carga, costo, bloqueado, falla de datos, sin JS | `xfeed-check.mjs` contra producción (solo GET y preflights), en y pt | 19/19; con el script corregido, publicaciones reales en los 4 casos con red (F-9) |
| Rendimiento | LCP, CLS, long tasks, bytes, en los tres idiomas | `perf.mjs` contra producción, desktop y móvil (CPU ×4) | CLS ≤ 0,005; LCP desktop 0,46–2,3 s (el más alto `/es/blog`), móvil 0,6–2,6 s (F-10). Sin Lighthouse (no está en el proyecto) |
| Seguridad | `/api/share/card` y `/{lang}/share` con parámetros hostiles, headers, `/api/internal/*` sin firma, fixtures en producción | `curl` GET (`logs/security-prod.txt`) | Tarjeta: siempre PNG, nunca 5xx, también con 6.000 caracteres; share: 200 + `noindex`, sin markup reflejado; headers de Q-13 presentes; `/api/internal/*` 405 a un GET; "Demo Labs" 0 veces en producción |
| Degradación | Sin Firestore, sin `OPENROUTER_API_KEY`/`GROQ_API_KEY`/`NEXT_PUBLIC_X_HANDLE` | El build local corre sin credenciales | `build` y todas las corridas sobre `next start` sin errores; vacíos dignos |
| Docs | README (variables, rutas), CHANGELOG, tarjetas de `/changelog` en 3 idiomas, `version.sync` | lectura + tests | F-6; `version.sync` y paridad de diccionarios en verde |

## 5. Qué se escribió en producción

- **En GitHub y claude.ai, autorizado por el dueño:** merge de #39 y #40, cierre de #41 con comentario y borrado de su rama, pausa de la rutina "Weekly Promptea update". El push forzado sobre `v1.8.3-tech` (para el rebase) se hizo con `--force-with-lease` contra la cabeza esperada.
- **Contra el sitio:** solo GET. Los scripts con Chrome que se corrieron contra producción (`perf`, `benchmarks-layout`, `xfeed-check`) abortan todo request que no sea GET (`xfeed-check`, desde este PR, deja pasar los preflights `OPTIONS` hacia Elfsight). Las corridas con publicaciones cuentan como vistas del widget en el panel de Elfsight (unas 4 por corrida). No se usó el Chrome del dueño, así que no hubo visitas con telemetría. No hubo altas, feedback, análisis, firmas ni publicaciones.

## 6. Lo que no se pudo verificar

1. **El preview de Vercel de este PR**: está protegido; se verificó el build local (`next start`).
2. **Elfsight en un navegador real con sesión**: se verificó en Chrome headless contra producción (F-9).
3. **Lector de pantalla real, dispositivo táctil físico, Lighthouse e INP.**
4. **Motor con LLM** (refinador, failover, juez): solo el camino determinístico y tests con mocks.
5. **Un alta real al newsletter** y el envío de emails.
6. **Rich Results Test, Search Console, Bing Webmaster Tools.**
7. **Revisión nativa del portugués.** Los controles son mecánicos y de muestreo.
8. **La rutina de AI Daily Tech**: no existe todavía; el flujo con notas se probó con el fixture y los tests.
9. **1920 px con el Chrome real**: el ancho de 1920 se cubrió en headless (`audit.mjs`).

## 7. Qué falta de tu lado

Ordenado por prioridad.

1. **Actualizar Next 16.1.1 → 16.4.6** (F-3, 4 avisos críticos). Hacelo en un PR propio con deploy de preview, a partir del 2026-11-23 (dos semanas después de publicada la 16.4.6): `npm install next@16.4.6 eslint-config-next@16.4.6`, `npm run lint && npm run typecheck && npm test && npm run build`, y recorré el preview.
2. **Dar de alta la rutina AI Daily Tech** en https://claude.ai/code/routines: nombre "Promptea AI Daily Tech", horario sugerido `0 15 * * *` (12:00 en Buenos Aires), el prompt de [`docs/editorial/tech-daily-routine.md`](../../editorial/tech-daily-routine.md), y `BLOG_PUBLISH_SECRET` con **el mismo valor** que usan las rutinas de AI Daily (la misma firma HMAC). No hace falta ninguna variable nueva en Vercel. Con la primera nota, `/blog/tech` vuelve solo al sitemap y a `llms.txt`. Leé los primeros informes de la rutina.
3. **Widget de Elfsight**: funciona en producción (F-9). Solo conviene mirar en su panel el consumo de vistas del plan, para que el card no pase al fallback a fin de mes.
4. **Variables opcionales de Vercel**: `ANTHROPIC_API_KEY` (habilita Claude como refinador de respaldo), `REFINER_PROVIDERS` (por ejemplo `groq,anthropic`) y `PROMPT_JUDGE_ENABLED=1` si querés la segunda opinión. `OPENROUTER_API_KEY` ya está (Benchmarks en `live`).
5. **Contraste del botón primario de Aqua** (F-7): decidir si se usa `#0061cc` (≈ 5,9:1) o se acepta 4,02:1.
6. **Search Console y Bing Webmaster Tools**: enviar `https://www.promptea.me/sitemap.xml`, revisar la cobertura de `/pt` y los avisos de hreflang, y pasar el Rich Results Test sobre `/en/how-it-works`, una guía y una nota de AI Daily.
7. **Revisión nativa del portugués** (interfaz, guías y páginas estáticas).
8. **Qué newsletter recibe un suscriptor de `/pt`**: hoy elige inglés o español y se guarda `uiLang: "pt"`.
9. **Política de bots de entrenamiento** en `lib/seo/crawlers.ts` (hoy: permitir todos).
10. **Las dos guías del bot que no se portaron** (`ai-prompts-for-customer-feedback`, `ai-prompts-for-proposals`): si las querés, se recuperan con `git fetch origin 23181558db9632a6f8346786d273fd5fb6fe5192` y se portan en un PR de contenido (su portugués no tiene revisión nativa).
11. **GPT-6 Astra Pro**: si OpenAI publica una página del modelo, se agrega al registro.
12. **`resend`** (aviso moderado): actualizarlo dentro de la 6.x junto con una prueba de envío `test`.
13. **Decisiones que siguen abiertas de v1.8.3**: `/api/analyze-llm` (integrarlo o borrarlo), límite de uso compartido (Redis) y Content-Security-Policy en `Report-Only`.
14. **Reactivar la rutina semanal** solo si querés que vuelva: está pausada, no borrada, en https://claude.ai/code/routines/trig_017JHGJRFJpaA67FXq1BFsnJ.

## 8. Cómo repetir

```bash
BASE_URL=https://www.promptea.me npm run seo:check                       # solo lectura
npm run build && npx next start -p 3182
BASE_URL=http://localhost:3182 npm run seo:check
MSYS_NO_PATHCONV=1 node scripts/release/audit.mjs --base=http://localhost:3182 --pages=/pt,/en,/es/blog/tech,/pt/sources
node scripts/release/qa-local.mjs --base=http://localhost:3182
node scripts/release/ambient-check.mjs --base=http://localhost:3182
BENCHMARKS_DEV_FIXTURE=1 BLOG_DEV_FIXTURE=1 NEXT_PUBLIC_X_HANDLE=promptea_me npx next dev -p 3181
node scripts/release/i18n-qa.mjs --base=http://localhost:3181 --widths=1440,768,375
node scripts/release/engine-qa.mjs --base=http://localhost:3181
node scripts/release/a11y-check.mjs --base=http://localhost:3181
MSYS_NO_PATHCONV=1 node scripts/release/sweep.mjs --base=http://localhost:3181 --match=/prompts --extra=/en/blog/tech,/pt/sources
node scripts/release/benchmarks-layout.mjs --base=https://www.promptea.me --lang=pt   # solo lectura
node scripts/release/xfeed-check.mjs --base=https://www.promptea.me --lang=pt         # solo lectura
node scripts/release/perf.mjs --base=https://www.promptea.me --pages=/en,/pt,/en/analyzer
```
