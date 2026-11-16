# Promptea v1.8.7 (parte B): chino simplificado (`/zh`)

PR lkl03/promptea#49, rama `claude/v187-zh`, cortada de la parte A (lkl03/promptea#48).

Esta parte agrega el cuarto idioma y sube la versión a **1.8.7**.

Fecha: 2026-11-16. Todo lo verificado en este informe se probó sobre un build local de producción (`next build` + `next start`). Contra producción no se escribió nada.

## 1. Resumen

| Fase | Qué quedó | Estado |
| --- | --- | --- |
| B1 Infraestructura | `LANGS` con `zh`; proxy (`zh`, `zh-CN`, `zh-SG`, `zh-Hans` → `/zh`; tradicional → `/en`); `<html lang="zh-CN">`; `og:locale` `zh_CN`; hreflang `zh-Hans` + `zh-CN` + `zh`; sitemap ×4; `/zh/llms.txt`; `llms-full.txt`; gemelos `.md`; feeds; selector de 4 opciones | Hecho |
| B2 Tipografía | Fuentes chinas del sistema bajo `:lang(zh)`, sin descargar fuentes CJK; interlineado 1.7; corte de línea estricto; sin cursivas; imágenes OG y de compartir en alfabeto latino (`imageLang()`) | Hecho, imágenes revisadas a ojo (§3) |
| B3 Diccionario y glosario | `zh.json` con las mismas claves que es/en/pt; [`zh-glossary.md`](../../i18n/zh-glossary.md); [`zh-review.md`](../../i18n/zh-review.md); `Intl` `zh-CN` | Hecho; **falta revisión nativa** |
| B4 Contenido SEO | Páginas núcleo, 11 páginas de modelos (DeepSeek, Kimi, Qwen, GLM, MiniMax y Doubao primero), 8 landings, 20 términos del glosario, 6 packs de prompts y 13 de 64 guías. Las otras 51 se muestran en inglés con aviso y canonical al original | Hecho (parcial a propósito) |
| B5 Motor en chino | Opción A: localización completa, motor 2.5.0, vocabulario zh, conteo por caracteres Han, 24 casos de calibración, detectores zh en "la mejor IA" | Hecho |
| B6 AI Daily y newsletter | AI Daily y el resumen semanal en inglés con aviso bajo `/zh`; el formulario preselecciona la edición en inglés y avisa; `uiLang: "zh"`; validadores y telemetría aceptan `zh` | Hecho |
| B7 QA y versión | Scripts extendidos a zh; versión 1.8.7 en `lib/version.ts`, `package.json`, `package-lock.json`, README, CHANGELOG y tarjetas del changelog en 4 idiomas | Hecho |

### Decisiones

- **Chino tradicional → `/en`.** En 30 días hubo 6 visitas de zh-TW/zh-HK, contra 155 de China continental. A un lector de Taiwán o Hong Kong, el simplificado le suena a error, así que el proxy lo manda a inglés (`TRADITIONAL_CHINESE` en `proxy.ts`).
- **Imágenes sin caracteres chinos.** `next/og` no trae fuente CJK, y empaquetar un subconjunto de Noto Sans SC pesa varios MB por función. La tarjeta de `/zh` usa el lema en inglés y los nombres de los modelos chinos. Test: `i18n.zh.test.ts`.
- **Opción A en el motor**, la localización completa. La salida no tiene palabras de otros idiomas, salvo los términos técnicos (JSON, API, nombres de modelos). La excepción documentada es la del prompt de imagen, que se arma en inglés como en portugués.
- **Guías.** Una guía entra a `/zh` (sitemap, hreflang, `llms.txt`) solo cuando tiene texto chino propio. Se tradujeron las 13 que más leen los lectores chinos: las de modelos chinos y las más vistas según Vercel Analytics.
- **Puntuación.** Donde el código une dos textos, el chino usa "：" y "。" sin espacio (`PUNCT` en `lib/domain.ts`). Lo mismo vale para los gemelos `.md`.

## 2. Hallazgos durante la parte B (y su arreglo)

| # | Hallazgo | Prioridad | Arreglo | Test |
| --- | --- | --- | --- | --- |
| Z-1 | Con 4 idiomas, una guía traducida al pt pero no al zh anunciaba solo es/en en su `<head>`, mientras el sitemap decía es/en/pt. Afectaba a 51 guías también en `/es` y `/en` | P1 | `pageMetadata({ locales })`; la guía pasa `guideLocales()` | `seo.guideLocales.test.ts` (falla sin el arreglo) |
| Z-2 | Prompts chinos contaban 1–3 "palabras" (sin espacios) y caían en "falta contexto" | P1 | `wordCount()` cuenta Han ÷ 1,7 | `engine.zh.test.ts` |
| Z-3 | "La mejor IA" no detectaba ninguna señal en un prompt chino (traducción, resumen, citas…) | P1 | `ZH_RE` en `lib/matcher/rubric.ts` | `engine.zh.test.ts` |
| Z-4 | El código pegaba ": " y ". " de medio ancho a textos chinos (motor, pie, benchmarks, CTA de guías) | P2 | `PUNCT` por idioma | `i18n.zh.test.ts` |
| Z-5 | Textos fijos en inglés en todos los idiomas: h1 del changelog, packs Marketing/Image/Data, botones del glosario en /models, insignia "preview" | P2 | `pick()` en 4 idiomas | parity + i18n-qa |
| Z-6 | El juez pedía la justificación en inglés para zh, así que `meta.judge` nunca aparecía | P2 | Línea de idioma zh-CN | — (requiere clave) |
| Z-7 | Tres descripciones chinas demasiado cortas para buscadores (kimi, grok, json-output) | P2 | Ampliadas | `seo:check` |
| Z-8 | Un prompt chino que pedía "胶囊形按钮" o fondo "米白色" igual recibía la línea que sugiere evitarlos (dirección de diseño de Claude Opus) | P2 | Términos chinos en `frontendAvoid` | `engine.zh.test.ts` |
| Z-9 | Revisando capturas y la vista previa: el h1 de la home se leía "Promptea ——…" (espacio antes de la raya china); el pie decía "Changelog" / "Benchmarks" y el panel del prompt optimizado "Checklist" en inglés bajo `/zh`; quedaban ": " de medio ancho en benchmarks, "la mejor IA" y AI Daily; los títulos de guías no traducidas enlazados desde el glosario no llevaban `lang="en"` | P2 | `PUNCT` en esos lugares, `pick()` para las etiquetas, `lang` en los enlaces | i18n-qa, revisión de capturas |

## 3. Matriz de pruebas

| Qué | Cómo | Resultado |
| --- | --- | --- |
| Tests | `npm test` | 93 archivos, **2.006 tests**, todos verdes |
| Tipos y lint | `npm run typecheck`, `npm run lint` | 0 errores, 0 warnings en el repo |
| Build | `next build` | OK; `/zh/*` se prerenderiza igual que los otros idiomas ([log](./logs/build-zh.txt)) |
| SEO | `BASE_URL=http://localhost:3191 npm run seo:check` sobre el build | **1.033 pasaron, 0 fallos** ([log](./logs/seo-check-zh-local.txt)). El chequeo mide el largo de las descripciones con ancho CJK (un carácter Han cuenta doble) y compara el hreflang de cada vista con el de su original |
| i18n con Chrome real | `i18n-qa.mjs --widths=1440,768,375 --shots=1`, 4 idiomas × 23 páginas; en home y analizador, 3 temas × claro/oscuro | **396 cargas, 0 fallos** ([log](./logs/i18n-qa-zh.txt)). Las 8 notas "sin chino" son nombres de modelos y dos títulos de guías no traducidas en el glosario: ahora llevan `lang="en"` |
| Motor por la API | `engine-qa.mjs`: 8 propósitos × prompt real en zh/pt/es/en; el prompt chino desde /es, /en y /pt; idempotencia | **104 / 104** ([log](./logs/engine-qa-zh.txt)). El prompt chino da el mismo puntaje, tipo de tarea y hallazgos desde las 4 interfaces |
| Imágenes | `/zh/opengraph-image` y `/api/share/card?lang=zh` abiertas y revisadas | Sin cuadrados vacíos ([og](./shots/zh/og-home-zh.png), [tarjeta](./shots/zh/share-card-zh.png)) |
| Barrido de familias | `sweep.mjs` sobre las URLs `/zh` de guías, modelos, glosario y landings × 1440/768/375 | **52 páginas × 3 anchos = 156 cargas, 0 hallazgos** ([log](./logs/sweep-zh.txt)): sin desbordes, texto cortado ni cadenas de otros idiomas, con un `<h1>` y `<html lang="zh-CN">` |
| Accesibilidad | `a11y-check.mjs` (incluye `/zh`: menú con teclado, foco, `<html lang="zh-CN">`, contraste en 4 temas) | **133 pasaron, 0 fallos** ([log](./logs/a11y-check-zh.txt)). En `/zh`: menú con teclado, foco visible, nombres accesibles y contraste AA. Siguen los 2 "known" de N-1 (Metro oscuro, decisión pendiente de la v1.8.5) |

Las capturas de `/zh` están en [`i18n/`](./i18n/), en 1440/768/375 y en los 3 temas × claro/oscuro para la home y el analizador. También está el resultado del analizador con un prompt chino. Los logs completos están en [`logs/`](./logs/).

## 4. Qué no se hizo o no se pudo verificar

- **Revisión nativa del chino.** Todo lo escribió IA. Los controles automáticos no reemplazan una lectura: el paquete está en [`zh-review.md`](../../i18n/zh-review.md).
- **51 guías sin traducir.** Se muestran en inglés con aviso y quedan fuera del índice chino. Para sumarlas alcanza con agregar el texto `zh` en `guides.ts`.
- **AI Daily en chino.** No existe: la rutina editorial publica en es/en.
- **`/zh` en producción y en la vista previa de Vercel.** No se desplegó nada. Hay que verificarlo en la vista previa del PR cuando Vercel la genere.
- **Juez y refinador LLM en chino.** Sin claves no se pudo verificar que Groq o Claude devuelvan los campos en zh-CN. La regla está en el prompt (`SYSTEM_RULES.zh`).
- **Fuentes CJK en Windows sin Microsoft YaHei, o en Linux sin Noto Sans SC.** Se probó en Windows 10 con Chrome. En otros sistemas cae a la fuente sans del sistema.

## 5. Qué falta de tu lado

En orden de prioridad (incluye lo de la parte A, que sigue vigente):

1. **Revisar y mergear la parte A (#48) y después la B (#49).** Al mergear A, esta rama necesita `git rebase --onto origin/main claude/v187-x-newsletter-benchmarks` y `gh pr edit 49 --base main`. No mergeé ninguna.
2. **`BUFFER_API_KEY`** (pestaña de Buffer abierta): publish.buffer.com → Settings → API → **+ New Key**. Después, en Vercel → Settings → Environment Variables: `BUFFER_API_KEY` (Production y Preview, *Sensitive*).
3. **`INDEXNOW_KEY`** (pestaña de Vercel abierta): generá una clave y cargala en Production. **Redeploy** junto con el paso 2.
4. **Revisión nativa del chino**: pasarle [`zh-review.md`](../../i18n/zh-review.md) a una persona de China continental. Recién después conviene promocionar `/zh`.
5. **Elfsight** (pestaña abierta): cuando la v1.8.7 esté en producción, borrá el widget en My Apps. No hay suscripción que cancelar.
6. **Search Console y Bing**: después del deploy, pedí la indexación de `https://www.promptea.me/zh` y volvé a enviar el sitemap. Medí hacia el 12/12 con la tabla de la v1.8.6.
7. **Decidir la edición de la newsletter para `/zh`.** Hoy se preselecciona inglés. Si los `uiLang: "zh"` crecen, se puede pensar una edición china.
8. Pendientes de la parte A: `firebase-admin` 14, N-1 (contraste de acento en Metro y Glass claro), política de bots de entrenamiento y variables opcionales del refinador. Ver [`qa-report.md`](./qa-report.md) §6.

## 6. Cómo repetir

```bash
npm run build && npx next start -p 3191
BASE_URL=http://localhost:3191 npm run seo:check
node scripts/release/i18n-qa.mjs --base=http://localhost:3191 --widths=1440,768,375 --shots=1 --out=docs/release/v1.8.7/i18n
node scripts/release/engine-qa.mjs --base=http://localhost:3191
MSYS_NO_PATHCONV=1 node scripts/release/sweep.mjs --base=http://localhost:3191 --match="^/zh/(guides|models|glossary|landing)/"
node scripts/release/a11y-check.mjs --base=http://localhost:3191
```
