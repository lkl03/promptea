# v1.8.8 — Verificación de modelos nuevos (Kimi K3.1 Pro y GPT-Image-2.6)

Fecha: 2026-11-20. Regla del registro (README, "Model registry maintenance policy"): solo documentación oficial del proveedor. Los artículos de prensa sirvieron únicamente para encontrar la página oficial y no son evidencia.

## Resumen

| Modelo | ¿Existe con ese nombre? | Qué se hizo |
| --- | --- | --- |
| **Kimi K3.1 Pro** (Moonshot) | Sí. Id de API `kimi-k3.1-pro`; existe además `kimi-k3.1-pro-highspeed` | **Agregado** como el Kimi por defecto. Kimi K3 pasa a `legacy` con `replacementId: "kimi-k3.1-pro"`, igual que se hizo con GPT-6 Sol |
| **GPT-Image 2.6 Sunburst / Flare** (OpenAI) | Sí, pero son **dos modelos distintos**: `gpt-image-2.6-sunburst` y `gpt-image-2.6-flare`. El nombre oficial lleva guion: "GPT-Image-2.6" | **No agregado**: son modelos de imagen y el registro no tiene un destino de imagen. Ver "Por qué no entra GPT-Image-2.6" |

## Kimi K3.1 Pro

| Dato | Valor | Fuente oficial |
| --- | --- | --- |
| Id de API | `kimi-k3.1-pro` (y `kimi-k3.1-pro-highspeed`) | [platform.kimi.ai/docs/models.md](https://platform.kimi.ai/docs/models.md), [kimi.com/news/kimi-k3-1-pro](https://www.kimi.com/news/kimi-k3-1-pro) |
| Qué es | Primer modelo de la serie K3.1, clase 3T, comprensión visual nativa | [platform.kimi.ai/docs/models.md](https://platform.kimi.ai/docs/models.md) |
| Fecha | La página oficial solo dice "更新于：2026-10-24" (fecha de actualización) y "即日起" (desde hoy). No encontré una fecha de lanzamiento aparte | [kimi.com/news/kimi-k3-1-pro](https://www.kimi.com/news/kimi-k3-1-pro) |
| Contexto | 1.048.576 tokens | [pricing/chat.md](https://platform.kimi.ai/docs/pricing/chat.md), [Hugging Face moonshotai/Kimi-K3.1-Pro](https://huggingface.co/moonshotai/Kimi-K3.1-PRO) |
| Salida | `max_completion_tokens` 131.072 por defecto, hasta 1.048.576 | [quickstart de K3.1 Pro](https://platform.kimi.ai/docs/guide/kimi-k3-1-pro-quickstart) |
| Entrada / salida | Texto, imagen (solo base64 o `ms://`, no URLs públicas) y video de entrada; texto de salida | quickstart |
| Razonamiento | Siempre activo; `reasoning_effort` low, high o max (por defecto max). temperature, top_p, n y las penalties son fijos | quickstart |
| Herramientas / JSON / búsqueda | Tool calling sí; `json_schema` con `strict: true` sí; búsqueda web "no recomendada para producción por ahora" | quickstart |
| Precio (USD por 1M tokens) | Pro: entrada 2,00, salida 10,00, cache hit 0,20. Highspeed: 4,00 / 20,00 / 0,20 | [platform.kimi.ai](https://platform.kimi.ai/), [pricing/chat.md](https://platform.kimi.ai/docs/pricing/chat.md) |
| Pesos | 2,8T totales y 104B activos (MoE), licencia "Kimi K3.1 Pro License" (no leí los términos) | Hugging Face (organización oficial) |

Los puntajes de aptitud de la entrada (`taskFit`, `reasoningTier`, `latencyClass`) son de Promptea y se heredaron de Kimi K3: Moonshot no los publica.

**Pendiente que encontró la verificación (no se tocó en este PR):** según la documentación de Moonshot, `kimi-k2.6` y `kimi-k2.7-code` están cerrados a usuarios nuevos desde el 1/11, con la baja prevista para fines de diciembre de 2026. En el registro siguen como `stable` y seleccionables. Conviene pasarlos a `deprecated` cuando Moonshot publique la fecha.

## GPT-Image-2.6 Sunburst y Flare

| Dato | Valor | Fuente oficial |
| --- | --- | --- |
| Qué son | Dos modelos. Sunburst es "el modelo base", para más detalle o ediciones precisas. Flare es "el modelo más chico", para cuando importa la velocidad | [guía de prompts de imagen](https://developers.openai.com/api/docs/guides/image-prompting?model=gpt-image-2.6) |
| Ids | `gpt-image-2.6-sunburst`, `gpt-image-2.6-flare` (un solo snapshot cada uno) | [Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst), [Flare](https://developers.openai.com/api/docs/models/gpt-image-2.6-flare) |
| Lanzamiento | 2026-11-04 | [changelog de OpenAI](https://developers.openai.com/api/docs/changelog), [system card](https://deploymentsafety.openai.com/chatgpt-images-2-6) |
| Endpoints | `v1/images/generations` y `v1/images/edits`; no `v1/responses` ni `v1/batch` | páginas de cada modelo |
| Parámetros | `complexity` low, medium o high (por defecto high); quality hasta `max`; salida png, jpeg, webp, svg y gif | [guía de generación de imágenes](https://developers.openai.com/api/docs/guides/image-generation) |
| Precio (USD por 1M tokens, igual para los dos) | Texto de entrada 5,00, imagen de entrada 8,00, imagen de salida 30,00 | [precios](https://developers.openai.com/api/docs/pricing) |
| Contexto, salida máxima, corte de conocimiento | **No figuran en la documentación oficial** | — |
| Contradicción | La página de precios lista tarifas Batch, pero las páginas de los modelos dicen que `v1/batch` no está soportado | — |

Lo que solo apareció en prensa (y por eso no se usó): una variante "Vector", "unos 6 s en calidad baja" y "más de 2x más rápido que 2.5". La página de anuncio de OpenAI (openai.com/index/introducing-images-2-6) devolvió HTTP 403.

### Por qué no entra GPT-Image-2.6

`MODEL_REGISTRY` lista los modelos **para los que Promptea optimiza un prompt de texto**: cada entrada tiene un `target` (gpt, claude, gemini…) y un `promptProfile`. No existe un destino de imagen ni un perfil de imagen. Cargar Sunburst y Flare con `target: "gpt"` y `selectable: false` haría pasar los tests, pero nadie los vería y el dato sería engañoso. Los prompts de imagen ya detectan "gpt-image" como generador (`lib/engine/imagePrompt.ts`, `lib/refine/router.ts`), así que el analizador los reconoce igual.

Para sumarlos de verdad hace falta un destino de imagen: está como idea en el reporte de release (§6).
