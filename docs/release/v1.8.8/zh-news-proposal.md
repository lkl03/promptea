# Propuesta: chino en la sección de noticias

Estado: **propuesta, sin implementar**, como pediste. Fecha: 2026-11-20.

## Qué es "la sección de noticias" en el código

Confirmado en el código: hoy son tres vistas de lo mismo, AI Daily. Comparten la colección `blog_posts` (más `newsletter_editions` para el semanal), las plantillas de `app/[lang]/blog/` y la regla de idioma.

| Vista | Ruta | Ediciones (`edition`) | Quién la publica |
| --- | --- | --- | --- |
| AI Daily | `/{lang}/blog`, `/{lang}/blog/<slug>` | `daily`, `daily-morning`, `weekly-recap`, `week-ahead` | rutinas `promptea-ai-daily` y `promptea-ai-daily-morning` |
| AI Daily Tech | `/{lang}/blog/tech` (las notas viven en `/{lang}/blog/<slug>`) | `tech-daily` | rutina `Promptea AI Daily Tech` |
| Resumen semanal (Promptea Weekly en el sitio) | `/{lang}/blog/weekly`, `/{lang}/blog/weekly/<fecha>` | edición de `newsletter_editions` | rutina `Promptea Weekly newsletter` (paso `publish`) |

El contenido existe en dos idiomas: `CONTENT_LANGS = ["es", "en"]` y el schema exige `locales.en` y `locales.es`. Para `/pt` y `/zh`, `CONTENT_LANG_FOR` (en `lib/domain.ts`) muestra el inglés con un aviso traducido. Esas vistas quedan fuera del sitemap y del hreflang de zh, y su canonical apunta al inglés. **Así que la propuesta abarca las dos: AI Daily y AI Daily Tech**, con un alcance distinto para cada una.

## Cuánto se lee hoy (Vercel Analytics)

- **16–19/11, visitantes por sección:** `/zh` 17, `/zh/blog` 5. Contra `/en/blog` 120, `/es/blog` 4 y `/en/blog/tech` 1.
- **China continental, 30 días:** 152 visitantes en todo el sitio. Singapur no cuenta: es tráfico automatizado y casi no entra a `/zh` (ver `analytics-singapore.md`).
- `/zh` está publicado desde hace 4 días: todavía no hay base para una decisión cara.

## Opciones

| | A. Como hoy | **B. Índice en chino** | C. Notas completas en chino, solo las de IA china | D. Todo en chino |
| --- | --- | --- | --- | --- |
| Qué ve el lector de `/zh` | Interfaz en chino; títulos y notas en inglés con aviso | Títulos, bajadas y resúmenes **en chino** en el índice, la marquesina y las tarjetas; el cuerpo, en inglés con aviso | Lo de B, y las notas sobre DeepSeek, Qwen, Kimi, GLM, MiniMax, Doubao, ByteDance, Alibaba o Tencent **completas en chino** | Todas las notas en chino |
| Cómo se genera | — | La rutina agrega un `locales.zh` **corto** (título, deck, summary, seoTitle, metaDescription), escrito a partir de los mismos hechos verificados | La rutina escribe un `locales.zh` completo cuando `companies` incluye una empresa china de IA | Las tres rutinas escriben `locales.zh` siempre |
| Rutinas | — | +1 bloque corto por nota en `promptea-ai-daily`, `-morning` y Tech. Unos minutos más por corrida | Lo de B, más una nota completa en chino en algunos días | Corridas más largas y caras, todos los días |
| Schema y servidor | — | `locales.zh` opcional con campos cortos, sin body; el validador lo acepta en el `dryRun` | `locales.zh` opcional completo; `slug` zh | Ídem C, obligatorio |
| Sitemap, hreflang, feeds | Sin cambios | Solo el índice `/zh/blog` pasa a ser indexable en chino. Las notas siguen con canonical al inglés | Las notas con zh completo entran al sitemap y al hreflang de zh y a un `/zh/blog/feed.xml` nuevo; el resto, como B | Todo `/zh/blog/*` al sitemap; feeds zh |
| Riesgo | Ninguno | Bajo: textos cortos, fáciles de revisar | Medio: noticias con datos traducidos por IA, sin revisión nativa diaria | Alto: volumen imposible de revisar; contenido traducido en masa para buscadores |
| Esfuerzo | — | **Mediano**: schema, render, tests y 3 prompts de rutina | Grande | Grande |
| AI Daily Tech | — | Recomendado igual que AI Daily | No: casi no se lee (1 visitante en `/en/blog/tech` en 4 días) | No |

## Recomendación

1. **Ahora: B para AI Daily y AI Daily Tech.** Es el arreglo más barato para que `/zh/blog` deje de ser una pared en inglés, y no agrega páginas en chino traducidas por IA a los buscadores.
2. **Medir 4 semanas:** visitantes de `/zh/blog`, clics desde el índice a una nota y suscripciones con `uiLang: "zh"`.
3. **C solo si** `/zh/blog` pasa de unos 50 visitantes por semana **y** ya está hecha la revisión nativa de la interfaz (`docs/i18n/zh-review.md`). Las notas sobre modelos chinos son las que tienen sentido en chino, y Promptea ya tiene sus páginas de modelo traducidas.
4. **D no**, por ahora.
5. **El semanal (Promptea Weekly)** sigue en inglés y español. Una edición china se piensa con los datos de `uiLang: "zh"` (pendiente de la v1.8.7).

## Si aprobás B: qué cambia exactamente

- `lib/blog/types.ts`: `locales.zh` opcional con `title`, `deck`, `summary`, `seoTitle` y `metaDescription`, con los mismos límites que en/es.
- `lib/blog/server.ts` y `render.ts`: bajo `/zh`, el índice, la marquesina y la cabecera de la nota usan el zh corto cuando existe; si no existe, el inglés de siempre.
- `app/[lang]/blog/page.tsx` y `tech/page.tsx`: `<html lang>` y JSON-LD del índice en zh-CN cuando hay textos en chino.
- Las notas siguen con canonical al inglés, así que el sitemap no cambia, salvo el índice `/zh/blog`.
- Las 3 rutinas: un paso más que escribe el bloque `zh` con las reglas del glosario (`docs/i18n/zh-glossary.md`), sin agregar hechos.
- Tests: schema, render bajo `/zh` con y sin zh, y que las notas sin zh se vean como hoy.
- Las notas viejas no se traducen hacia atrás: B se aplica desde la primera publicación después del deploy.
