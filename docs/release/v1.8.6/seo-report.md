# Promptea v1.8.6: SEO para EE. UU. y Asia

Fecha: 2026-11-14 · Base: `main` @ `cf3941e` (v1.8.5 + #45).

Este PR sale del análisis de tráfico del 2026-11-14 ([informe](https://claude.ai/artifact/QFUYLi4jSui5sidAyi4b3p)), que encontró dos cosas:

- **El analizador en inglés no rinde en EE. UU.** "prompt analyzer" está en posición 11–14 en EE. UU., contra 5,3 a nivel global, y no recibe clics. EE. UU. en total tiene 14 clics sobre 2.368 impresiones (CTR 0,6 %).
- **Faltan modelos chinos.** Los lectores chinos reales leen guías en inglés de DeepSeek, Kimi, prompt debugging y aprendizaje. Faltaban Qwen, GLM, MiniMax y Doubao.

El idioma zh quedó descartado por ahora, y `hreflang`/`x-default` ya estaban bien.

## 1. Qué páginas cambian

### Analizador (intención "prompt analyzer")

| URL | Cambio |
| --- | --- |
| `/en/analyzer` | `<title>`: "Prompt analyzer — free AI prompt checker and optimizer". Descripción nueva. Debajo de la herramienta: los seis criterios, un enlace a los ejemplos y una FAQ de 3 preguntas con `FAQPage`. |
| `/es/analyzer`, `/pt/analyzer` | Misma sección y misma FAQ traducidas (paridad). Título y descripción sin cambios, salvo la lista de IAs en la descripción. |
| `/en/landing/prompt-analyzer` | Título "AI prompt analyzer — score and fix prompts, with examples". Descripción con los puntajes reales, h1 "AI prompt analyzer" y una primera oración que define el término. Suma 3 ejemplos antes → después (marketing 20 → 64, depuración 19 → 84, JSON 63 → 78) y una FAQ de 6 preguntas con `FAQPage`. Enlaces a `prompt-quality-scoring` y `prompt-debugging`. |
| `/es|pt/landing/prompt-analyzer` | Ejemplos y FAQ traducidos. Los puntajes son los que da el motor en ese idioma: es 26 → 70, 19 → 82 y 63 → 75; pt 26 → 70, 25 → 82 y 63 → 78. |
| 11 guías (×3 idiomas) | Una oración con enlace "prompt analyzer" → `/{lang}/analyzer`, después de las secciones. Las guías son: `prompt-checklist`, `prompt-quality-scoring`, `prompt-debugging`, `json-output`, `negative-prompting`, `translation-prompts`, `ai-prompts-for-learning`, `ai-prompts-for-design`, `gemini-prompt-guide`, `deepseek-prompt-guide` y `kimi-prompt-guide`. Son las más leídas desde EE. UU., China y Singapur, más las dos del tema. |

Para que las dos URLs no compitan por la misma consulta, cada una tiene un ángulo propio. `/analyzer` es la herramienta ("free AI prompt checker"). La landing es la explicación con ejemplos ("AI prompt analyzer … with examples"). Sus FAQ no repiten preguntas, y un test lo verifica.

### Modelos chinos

| URL | Cambio |
| --- | --- |
| `/{es,en,pt}/models/qwen` · `glm` · `minimax` · `doubao` | Páginas nuevas, en los tres idiomas. Cada una lista los modelos vigentes del registro con su fecha y fuente. |
| `/{es,en}/guides/qwen-prompt-guide` · `glm-` · `minimax-` · `doubao-prompt-guide` | Guías nuevas. En `/pt` se muestran en inglés con el aviso de idioma; no entran al índice pt ni a su hreflang, igual que otras guías sin traducir. |
| `/{lang}/models/*` (las 11) | Botón "Guía de prompts" cuando la familia tiene guía. |
| `/{lang}/analyzer`, `/best-ai` | Los 4 targets nuevos en el selector y en el matcher. |
| Home, how-it-works, best-ai, models, guides, JSON-LD | Las listas de IAs soportadas nombran las familias nuevas. |
| `sitemap.xml`, `llms.txt`, `llms-full.txt`, gemelos `.md` | Incluyen las 12 páginas de modelo y las 8 de guía nuevas, con `lastmod` 2026-11-14. |

### Datos verificados (2026-11-14, solo documentación oficial)

| Familia | Modelos (id de API) | Fuente |
| --- | --- | --- |
| Qwen (Alibaba Cloud Model Studio) | `qwen3.8-max` (por defecto), `qwen3.7-plus`, `qwen3.8-flash`. `qwen3-max` retirado el 2026-10-10. | alibabacloud.com/help/en/model-studio |
| GLM (Z.ai / Zhipu AI) | `glm-5.3` (por defecto; solo texto, siempre razona), `glm-5.3-flash` | docs.z.ai, docs.bigmodel.cn (guía de prompts) |
| MiniMax | `MiniMax-M3` (por defecto), `MiniMax-M3.1-Flash`. `MiniMax-M2.7` legacy, se retira el 2026-11-18. | platform.minimax.io/docs |
| Doubao (ByteDance, Volcengine Ark) | `doubao-seed-2-1-pro-260915` (por defecto), `-lite-260915`, `-turbo-260628`. `doubao-seed-1-6-250615` dado de baja el 2026-09-21. | docs.volcengine.com/docs/82379 |

Lo que la documentación no dice no se afirma:

- **MiniMax:** la salida máxima queda en `null` y no se le atribuye modo JSON.
- **GLM-5.3 Flash:** no se le atribuye salida estructurada.
- **Doubao:** los ids son los de Volcengine. En BytePlus la familia se llama Dola Seed y sus ids no se confirmaron.

Cada perfil de prompt (`qwen-general`, `glm-reasoner`, `minimax-agent`, `doubao-seed`) cita su página de origen. MiniMax y Doubao no publican una guía general de prompts, así que su perfil codifica solo lo que dicen las páginas de la API.

### IndexNow

- **Clave:** `/indexnow-key.txt` publica `INDEXNOW_KEY`, que es una variable de entorno y no está en el repo. Devuelve 404 mientras no exista.
- **AI Daily:** `/api/internal/blog/publish` avisa las URLs en/es de la nota y el índice de su sección, después de responder (`after()`). Solo lo hace en una publicación nueva. Las rutinas no cambian.
- **Guías y demás contenido:** `.github/workflows/indexnow.yml` corre `scripts/seo/indexnow.mjs` tras cada deploy de producción (evento `deployment_status` de Vercel). El script envía las URLs del sitemap con `lastmod` de los últimos 2 días y lee la clave del propio sitio, así que no usa secretos de GitHub. Sin clave termina en 0 sin enviar nada.
- **A mano:** `npm run seo:indexnow -- --dry-run` lista lo que enviaría. Contra producción, con la clave todavía sin configurar, listó 183 URLs de los últimos 3 días.

### `llms-full.txt`

Las cuatro familias nuevas llevaban la parte fija en español a ~356 KB, y el test la limita a 330. Se compactó como ya preveía `lib/seo/llms.ts`, moviendo contenido de las guías a sus gemelos `.md`:

- las guías listan sus preguntas frecuentes, con las respuestas en el gemelo;
- las páginas de modelo listan sus plantillas por título;
- la landing enlaza sus ejemplos en vez de copiarlos.

Medido después: en ~275 KB, es ~302 KB, pt ~297 KB.

## 2. Verificación

| Chequeo | Resultado |
| --- | --- |
| `npm test` | 82 archivos, 1.757 tests, verde (1.707 en v1.8.5) |
| `npm run typecheck`, `npm run lint` | Verde |
| `npm run build` | Verde |
| `npm run seo:check` (build local en `:3191`, todas las URLs del sitemap) | **846 passed, 0 failed, 0 warnings** |
| Navegador (375 px y escritorio) | Sin scroll horizontal en la landing, el analizador y `/es/models/doubao`. FAQPage presente en `/en/analyzer`. El selector ofrece las 11 familias. |
| `/api/analyze` con `target: "doubao"` | 200, prompt optimizado |

Tests nuevos:

- `seo.analyzer.test.ts`: los puntajes impresos son los que da el motor en cada idioma; FAQPage solo en páginas que imprimen la FAQ; FAQ distintas entre `/analyzer` y la landing.
- `models.chinese.test.ts`: fuentes oficiales, fecha, perfil, página, guía y sitemap.
- `seo.indexnow.test.ts`: clave, payload, envío y ruta de la clave.
- Dos casos nuevos en `api-blog-publish-route.spec.ts`: ping al publicar, y ningún ping sin clave, en `already_published` ni en `dryRun`.

## 3. Qué falta del dueño

1. **Clave de IndexNow.** Generá una clave, por ejemplo con `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`. Cargala en Vercel → Settings → Environment Variables como `INDEXNOW_KEY` (Production) y redeployá.
2. **Comprobar la clave.** `https://www.promptea.me/indexnow-key.txt` tiene que devolver la clave.
3. **Primer envío.** El workflow `IndexNow` corre solo en el próximo deploy de producción (pestaña Actions de GitHub). Para avisar también lo de las últimas semanas: `npm run seo:indexnow -- --days 30`.
4. **Bing Webmaster Tools** (propiedad en eterlab): en la sección IndexNow deberían aparecer las URLs enviadas en 1–2 días.

## 4. Qué medir en Search Console a 4 semanas (~2026-12-12)

Compará 28 días contra los 28 días anteriores al merge. Filtro país = **Estados Unidos** salvo que se indique otro. La línea de base es del informe de tráfico (28 días al 2026-11-13).

| Qué | Dónde (Search Console → Rendimiento) | Base | Señal de que funcionó |
| --- | --- | --- | --- |
| "prompt analyzer" | Consultas = `prompt analyzer`, EE. UU. | pos. 11,4 · 58 impr. · 0 clics | Posición ≤ 10 y primeros clics |
| "prompts analyzer" | idem | pos. 13,6 · 77 impr. · 0 clics | Posición ≤ 10 |
| "ai prompt analyzer" | idem | pos. 10,0 · 29 impr. · 0 clics | Posición ≤ 8 |
| Qué URL elige Google para esas consultas | Consulta → pestaña Páginas | Sin dato | Una sola URL dominante por consulta (si alternan `/en/analyzer` y la landing, hay canibalización) |
| CTR de EE. UU. | País = EE. UU. | 0,6 % (14 / 2.368) | ≥ 1,5 % |
| `/en/analyzer` y `/en/landing/prompt-analyzer` | Páginas, EE. UU. | Sin dato separado | Más impresiones y clics que en la base |
| Páginas nuevas indexadas | Indexación → Páginas, o Inspección de URL de las 12 + 8 | 0 | Las 4 `/en/models/*` y las 4 `/en/guides/*-prompt-guide` indexadas |
| Consultas de modelos chinos | Consulta contiene `qwen`, `glm`, `minimax`, `doubao` (todos los países) | 0 | Impresiones en las páginas nuevas |
| Datos estructurados | Mejoras → FAQ (si aparece) / Rich Results Test de las 2 URLs | — | FAQPage válida, sin errores. Google muestra fragmentos FAQ solo a pocos sitios; el objetivo es que el marcado sea válido, no el fragmento. |
| Bing | Bing Webmaster → IndexNow y Rendimiento | Sitemap "Processing" | URLs enviadas aceptadas; impresiones de EE. UU. y China |

En Vercel Analytics se puede mirar algo más: las páginas vistas de `/en/analyzer` que llegan desde guías. Para medir el clic del enlace de cada guía hacen falta los eventos personalizados que propuso el informe de tráfico (mejora 1); no son parte de este PR.
