# Revisión nativa del chino simplificado (zh-CN): paquete para quien revise

Todo el texto de `/zh` lo escribió IA en la v1.8.7 y solo tuvo controles mecánicos: scripts que buscan textos sin traducir, puntuación de medio ancho pegada a caracteres chinos y palabras sueltas en inglés, español o portugués. Nadie nativo lo leyó todavía. Este documento es para pasárselo a una persona nativa de la China continental: qué leer, en qué orden, con qué criterio y cómo devolver las correcciones. No hace falta saber programar.

Estado al 2026-11-16 (v1.8.7):
- interfaz completa (diccionario `zh.json` con las mismas claves que es/en/pt);
- 13 de 64 guías;
- los 20 términos del glosario;
- las 11 páginas de modelos;
- las 8 landings;
- los 6 packs de prompts;
- las páginas estáticas: cómo funciona, sobre, metodología, fuentes y privacidad;
- todos los mensajes del analizador y de "la mejor IA".

AI Daily, el resumen semanal y 51 guías **no** están traducidos: bajo `/zh` se muestran en inglés con un aviso, a propósito (ver §5).

## 1. Qué abrir primero (por impacto)

Revisar en el sitio publicado, en un navegador normal (si `/zh` todavía no está en producción, en la vista previa del PR).

1. **Inicio**: https://www.promptea.me/zh
2. **Analizador** (分析器), con un prompt de prueba: https://www.promptea.me/zh/analyzer. Pegar un pedido corto en chino, elegir una IA y un propósito y apretar "分析". Revisar los resultados: 评分, 发现的问题, 建议 y 优化后的提示词. Son los textos que más se leen. Probar también un pedido largo y uno de imagen; en el de imagen, el prompt final sale **en inglés** a propósito, con aviso (§5).
3. **Cómo funciona** (工作原理): https://www.promptea.me/zh/how-it-works
4. **La mejor IA** (最佳AI): https://www.promptea.me/zh/best-ai. Escribir una tarea en chino y ver la recomendación.
5. **Páginas de los modelos chinos**, que son el motivo principal de `/zh`. Orden sugerido:
   - https://www.promptea.me/zh/models/deepseek
   - `/zh/models/kimi`
   - `/zh/models/qwen`
   - `/zh/models/glm`
   - `/zh/models/minimax`
   - `/zh/models/doubao`

   Después, sus guías: `/zh/guides/deepseek-prompt-guide`, `kimi-prompt-guide`, `qwen-prompt-guide`, `glm-prompt-guide`, `minimax-prompt-guide` y `doubao-prompt-guide`.
6. **Guías traducidas restantes**:
   - `prompt-checklist`
   - `json-output`
   - `chatgpt-prompts-for-work`
   - `claude-prompt-guide`
   - `translation-prompts`
   - `ai-prompts-for-learning`
   - `prompt-debugging`

   Las plantillas (los bloques de prompt) cuentan: alguien las va a copiar tal cual.
7. **Benchmarks** (基准测试): https://www.promptea.me/zh/benchmarks
8. **Prompts** (los packs): https://www.promptea.me/zh/prompts y sus seis secciones.
9. **Glosario** y **Modelos**: https://www.promptea.me/zh/glossary, https://www.promptea.me/zh/models
10. **Sobre**, **Metodología**, **Privacidad**, **Fuentes**: `/zh/about`, `/zh/methodology`, `/zh/privacy`, `/zh/sources`
11. **El formulario de la newsletter** (en el inicio y en `/zh/blog`), los avisos de "contenido en inglés" en `/zh/blog` y en una guía no traducida (por ejemplo `/zh/guides/chain-of-thought`), y la página 404 (`/zh/cualquier-cosa`).

Con los puntos 1 a 6 se cubre lo que ve la gran mayoría de las visitas.

## 2. Criterio

La terminología está fijada en [`zh-glossary.md`](./zh-glossary.md):
- 你, y 您 solo en privacidad y en la baja de la newsletter;
- 提示词 y nunca "prompt" en el texto corrido;
- 评分, 发现的问题, 建议, 优化后的提示词;
- puntuación de ancho completo;
- sin espacio entre un carácter chino y una palabra latina o un número.

Si algo del glosario suena mal a un nativo, se cambia el glosario y después el texto, no al revés.

Marcar sobre todo:

- **Lo que suena traducido**: 翻译腔, calcos del inglés, frases demasiado largas, voz pasiva innecesaria.
- **Términos inconsistentes** entre páginas (la misma cosa dicha de dos maneras).
- **Términos del sector** que un usuario chino de DeepSeek, Kimi o Qwen diría de otra forma (por ejemplo: 上下文窗口, 推理模型, 智能体).
- **Tono**: directo y útil, sin exagerar ni vender.

No hace falta marcar:
- nombres propios y de productos (Promptea, ChatGPT, Claude, DeepSeek, AI Daily…);
- identificadores técnicos (`JSON`, `reasoning_effort`, `max_tokens`);
- nombres de campos dentro de las plantillas (`entity_type`, `PASS/FAIL`);
- el contenido en inglés de AI Daily y de las guías no traducidas.

### Dudas de traducción que conviene resolver

Son decisiones que tomó la IA y que un nativo debería confirmar o cambiar. Las de más arriba son las más visibles.

| Inglés | Elegido | Alternativa | Dónde |
| --- | --- | --- | --- |
| Changelog | 更新日志 | 版本历史 | `/zh/changelog`, pie de página |
| Before / After (score) | 优化前 / 优化后 | 之前 / 之后 | resultados del analizador, guías |
| words (contador) | 词 | 字 (el motor cuenta caracteres Han ÷ 1,7, o sea "palabras" aproximadas) | tarjeta del score |
| email ≤ 120 words | 120字 | 120词 | packs de prompts |
| Newsletter | 邮件通讯（Promptea Weekly） | 邮件通讯（Promptea每周通讯） | formulario |
| Cold email | 开发信 | 陌生开发邮件 | pack de marketing |
| Hallucinations (botón) | 幻觉 | 幻觉（Hallucinations） | `/zh/models` |
| Doubao | Doubao | 豆包（Doubao） | todo el sitio |
| Alibaba Cloud Model Studio | Alibaba Cloud Model Studio（阿里云百炼） | solo 阿里云百炼 | `/zh/models/qwen` |
| Volcengine Ark | Volcengine Ark（火山方舟） | solo 火山方舟 | `/zh/models/doubao` |
| Minimal context | 必要的背景 | 基本上下文 | prompt optimizado |
| stubs or placeholders | stub或placeholder | 桩代码或占位符 | prompt optimizado (código) |
| schema | 数据结构 | dejar "schema" | prompt optimizado (datos) |
| hook (marketing) | 开头钩子 | 吸引点 | prompt optimizado (marketing) |
| BRIEF: / REQUEST: | 简报： / 需求： | 需求简介： / 请求： | prompt optimizado |
| register (traducción) | 译文风格 | 语体 | prompt optimizado (traducción) |
| Technical tie | 难分高下 | 技术性平局 | "la mejor IA" |
| pre-mortem | 事前验尸（pre-mortem） | 预先复盘 | guías |
| Score (columna de benchmarks) | 得分 | 评分 (pero 评分 ya es el puntaje de Promptea) | `/zh/benchmarks` |
| System (tema) | 跟随系统 | 系统 | selector de tema |

## 3. Cómo devolver las correcciones

Una planilla (o un documento) con estas columnas, una fila por corrección:

| Página (URL) | Texto actual (copiado tal cual) | Texto corregido | Motivo (opcional) | Importancia (alta / media / baja) |
| --- | --- | --- | --- | --- |
| https://www.promptea.me/zh/analyzer | 粘贴你想改进的提示词… | (corrección) | (por qué) | media |

- Copiar el texto actual **exacto**: así se encuentra en el código sin ambigüedad.
- Si una misma corrección se repite en muchas páginas, alcanza con una fila que diga "en todas las páginas".
- Las capturas de pantalla ayudan con textos de botones, menús o mensajes que aparecen un momento.

## 4. Dónde vive cada texto (para quien aplique las correcciones)

| Qué | Archivo |
| --- | --- |
| Interfaz (botones, menús, formularios, mensajes) | `app/[lang]/dictionaries/zh.json` (el test de paridad exige las mismas claves que es/en/pt) |
| Guías | `lib/seo/content/guides.ts` (campo `zh` de cada guía traducida) y `lib/seo/content/chineseModels.ts` (las de Qwen, GLM, MiniMax y Doubao) |
| Modelos | `lib/seo/content/models.ts` y `chineseModels.ts` |
| Glosario y landings | `lib/seo/content/glossary.ts`, `landings.ts` |
| Páginas estáticas | `lib/seo/content/sitePages.ts`, `sourcesPage.ts`; privacidad en `app/[lang]/privacy/page.tsx` |
| Packs de prompts | `app/[lang]/prompts/*/page.tsx` (textos en `pick()`) |
| Mensajes del analizador | `lib/engine/lint/catalog.ts`, `findings.ts`, `feedback.ts`, `recommendations.ts`, `scoring.ts`, `shapes.ts`, `jsonOutput.ts`, `modelProfiles.ts` |
| "La mejor IA" | `lib/matcher/rubric.ts` (etiquetas y detectores) y `explanations.ts` |
| llms.txt y los gemelos `.md` | `lib/seo/llms.ts`, `lib/seo/markdown.ts` |

Para traducir una guía nueva, se agrega su texto `zh` en `guides.ts`. Al tener texto propio, la guía entra sola en el sitemap, el hreflang y `/zh/llms.txt` (`guideLocales()`), y deja de mostrar el aviso.

Después de aplicar:
- `npm run lint`, `npm run typecheck` y `npm test` (incluye `engine.zh`, `i18n.zh` y la paridad de diccionarios);
- `npm run seo:check` sobre un build local.

Los títulos de las guías tienen un máximo de 110 caracteres y las descripciones de 60 a 320 (lo controla `seo.content.test`).

## 5. Decisiones de la v1.8.7 (no son errores de traducción)

- **Solo chino simplificado.** Los navegadores en zh-TW, zh-HK, zh-MO o zh-Hant van a `/en` y no a `/zh`. Motivo: en 30 días hubo 6 visitas con esos idiomas, y mostrarles simplificado se lee como un error. `zh`, `zh-CN`, `zh-SG` y `zh-Hans` van a `/zh` (`proxy.ts`).
- **Tipografía.** Se usan las fuentes chinas del sistema (PingFang SC, Microsoft YaHei, Noto Sans SC…), sin descargar fuentes CJK: pesan varios MB. Sin cursivas: el énfasis va en negrita. El interlineado es más alto y el corte de línea, estricto (`app/globals.css`, bloque `:lang(zh)`).
- **Imágenes para compartir (Open Graph, la tarjeta del score).** Llevan texto en inglés, porque el generador de imágenes no tiene una fuente china y los caracteres saldrían como cuadrados vacíos. La tarjeta del inicio en `/zh` muestra los nombres de los modelos chinos.
- **Prompt de imagen.** Con un pedido de imagen, el prompt final se arma en inglés alrededor de las palabras del usuario, como en portugués. Los generadores de imágenes responden mejor en inglés. La interfaz lo avisa en chino.
- **AI Daily y el resumen semanal** se publican solo en inglés y español. Bajo `/zh` se ven en inglés con un aviso traducido. No entran en el sitemap ni en el hreflang de `/zh`.
- **Guías no traducidas (51).** Bajo `/zh/guides/<slug>` se ven en inglés con un aviso. El canonical apunta al original en inglés, y no figuran en el sitemap, el hreflang ni `/zh/llms.txt`. Así no compiten con la versión inglesa ni se indexan como contenido duplicado.
- **Newsletter.** Hay dos ediciones, inglés y español. Desde `/zh` el formulario preselecciona inglés y avisa que no hay edición en chino. Queda registrado `uiLang: "zh"`, para medir si vale la pena una edición china.
- **Fechas.** Las fechas del editorial van en formato ISO (2026-11-16), que es también el orden chino. El resto usa `Intl` con `zh-CN`.

## 6. Pasada asistida (2026-11-16): no reemplaza la revisión nativa

Controles automáticos que ya pasaron:
- ningún texto `zh` igual a su versión en inglés, salvo nombres propios;
- sin puntuación de medio ancho (`:`, `.`, `,`) pegada a caracteres chinos en el texto que arma el código (`PUNCT` en `lib/domain.ts`);
- sin palabras sueltas de otros idiomas en la salida del motor (`engine.zh.test.ts`);
- encabezados de `/zh/llms.txt` en chino;
- 24 casos de calibración en chino que puntúan igual que sus gemelos en portugués (±6).

Quedó sin hacer: leer las traducciones en contexto. Eso es lo que pide este documento.
