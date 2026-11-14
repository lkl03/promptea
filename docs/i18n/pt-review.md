# Revisión nativa del portugués (pt-BR): paquete para quien revise

Todo el texto de `/pt` lo escribió IA (v1.8.2 en adelante) y solo tuvo controles mecánicos y de muestreo. Este documento es para pasárselo a una persona nativa de Brasil: qué leer, en qué orden, con qué criterio y cómo devolver las correcciones. No hace falta saber programar.

Estado al 2026-11-13 (v1.8.5): interfaz completa (521 textos, unas 3.100 palabras), 60 guías, 20 términos del glosario, 7 páginas de modelos, 8 landings, 6 packs de prompts, las páginas estáticas y los mensajes del analizador. AI Daily y el resumen semanal **no** se traducen: bajo `/pt` se muestran en inglés con un aviso, a propósito.

## 1. Qué abrir primero (por impacto)

Revisar en el sitio publicado, en un navegador normal. El orden es por tráfico y por lo que ve alguien en su primera visita.

1. **Inicio** — https://www.promptea.me/pt
2. **Analisador**, con un prompt de prueba — https://www.promptea.me/pt/analyzer. Pegar un texto corto, elegir una IA y un propósito y apretar "Analisar". Revisar los resultados: pontuação, achados, recomendações y el prompt otimizado. Son los textos que más se leen.
3. **Como funciona** — https://www.promptea.me/pt/how-it-works
4. **Melhor IA** — https://www.promptea.me/pt/best-ai (escribir una tarea y ver la recomendación)
5. **Benchmarks** — https://www.promptea.me/pt/benchmarks
6. **Guias** — https://www.promptea.me/pt/guides. Empezar por las más visitadas: `json-output`, `prompt-checklist`, `chatgpt-prompts-for-work`, `claude-prompt-guide` y las dos nuevas de la v1.8.5: `ai-prompts-for-customer-feedback` y `ai-prompts-for-proposals`. Las plantillas (los bloques de prompt) cuentan: alguien las va a copiar tal cual.
7. **Prompts** (packs) — https://www.promptea.me/pt/prompts y sus seis secciones.
8. **Glossário** y **Modelos** — https://www.promptea.me/pt/glossary, https://www.promptea.me/pt/models
9. **Sobre**, **Metodologia**, **Privacidade**, **Fontes** — https://www.promptea.me/pt/about, `/pt/methodology`, `/pt/privacy`, `/pt/sources`
10. **Formulário da newsletter** (en el inicio y en `/pt/blog`), los avisos de "conteúdo em inglês" en `/pt/blog`, y la página 404 (`/pt/qualquer-coisa`).

Con los puntos 1 a 6 ya se cubre lo que ve la gran mayoría de las visitas.

## 2. Criterio

La terminología está fijada en [`pt-glossary.md`](./pt-glossary.md) (usar **você**, "o Promptea", "pontuação", "achado", "template" y no "modelo" para plantillas, "e-mail", fechas `DD/MM/AAAA`, etc.). Si algo del glosario suena mal a un nativo, se cambia el glosario y después el texto, no al revés.

Marcar sobre todo:

- **Lo que suena traducido** (calcos del inglés o del español, orden de palabras raro, preposiciones que no van). Ejemplo de algo que ya se corrigió: "responda ao edital, não com um pitch genérico" → "responda ao que o cliente pediu, sem pitch genérico".
- **Errores** de concordancia, regencia, acentos o crase.
- **Términos inconsistentes** entre páginas (la misma cosa dicha de dos maneras).
- **Tono**: directo y cercano, sin exagerar ni vender.

No hace falta marcar: nombres propios y de productos (Promptea, ChatGPT, Claude, Gemini, AI Daily…), identificadores técnicos (`JSON`, `reasoning_effort`), los marcadores entre corchetes de las plantillas (`[cole aqui…]` sí se revisa; `[ID]` o nombres de campos de un esquema no) ni el contenido en inglés de AI Daily.

## 3. Cómo devolver las correcciones

Una planilla (o un documento) con estas columnas, una fila por corrección:

| Página (URL) | Texto actual (copiado tal cual) | Texto corregido | Motivo (opcional) | Importancia (alta / media / baja) |
| --- | --- | --- | --- | --- |
| https://www.promptea.me/pt/analyzer | Cole aqui o prompt que você quer melhorar… | (corrección) | (por qué) | media |

- Copiar el texto actual **exacto**: así se encuentra en el código sin ambigüedad.
- Si una misma corrección se repite en muchas páginas, alcanza con una fila que diga "en todas las páginas".
- Capturas de pantalla son bienvenidas para textos de botones, menús o mensajes que aparecen un momento.

## 4. Dónde vive cada texto (para quien aplique las correcciones)

| Qué | Archivo |
| --- | --- |
| Interfaz (botones, menús, formularios, mensajes) | `app/[lang]/dictionaries/pt.json` (el test de paridad exige las mismas claves en es/en/pt) |
| Guías | `lib/seo/content/guides.ts` (campo `pt` de cada guía; título, descripción, secciones, plantillas y FAQ) |
| Glosario, modelos, landings | `lib/seo/content/glossary.ts`, `models.ts`, `landings.ts` |
| Páginas estáticas (cómo funciona, sobre, metodología) | `lib/seo/content/sitePages.ts` |
| Fuentes | `lib/seo/content/sourcesPage.ts` |
| Packs de prompts | `app/[lang]/prompts/*/page.tsx` (textos en `pick()`) |
| Mensajes del analizador (achados, recomendações) | `lib/engine/findings.ts`, `feedback.ts`, `features.ts`, `extractor.ts`, `imagePrompt.ts` |

Después de aplicar: `npm run lint`, `npm run typecheck`, `npm test` (incluye `i18n.pt-content` y la paridad de diccionarios) y `npm run seo:check` sobre un build local. Los títulos de las guías tienen un máximo de 110 caracteres y las descripciones de 60 a 320 (lo controla `seo.content.test`).

## 5. Fuera de alcance de esta revisión

- Qué newsletter recibe un suscriptor de `/pt` (hoy elige inglés o español): es una decisión de producto, no de traducción.
- Traducir AI Daily o el resumen semanal: hoy se muestran en inglés bajo `/pt` a propósito.
