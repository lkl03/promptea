# v1.8.7 — ¿Una página por modelo en /benchmarks?

Fecha: 2026-11-16 · Decisión: **no, por ahora.** El análisis de cada modelo es un panel dentro de `/{lang}/benchmarks`, con estado compartible por hash (`#m=<modelo>`, `#c=<a>,<b>`). No hay ruta `/{lang}/benchmarks/<modelo>`.

## Lo que se evaluó

Una ruta por modelo generada desde el snapshot vivo, con `noindex` cuando el snapshot es viejo o el modelo sale del ranking, canonical, JSON-LD `Dataset` y el resto del set: sitemap, `llms.txt`, gemelo `.md`.

## Por qué no ahora

1. **Contenido fino.** El snapshot de producción del 2026-11-16 tiene 224 modelos en 23 benchmarks. Muchos aparecen en uno o dos: en la vista rápida de frontera, el sexto modelo general está en 10 benchmarks, pero la cola larga tiene una sola fila. Una página por modelo serían ~224 × 3 idiomas (× 4 con zh) ≈ 900 URLs. La mayoría tendría una tabla de 1 a 3 filas y el mismo texto de plantilla. Es el patrón de "thin content" que Search Console penaliza, y diluiría el rastreo de las guías y páginas de modelo que sí rinden (ver `docs/release/v1.8.6/seo-report.md`).
2. **Páginas que nacen y mueren con los datos.** OpenRouter cambia la lista de modelos varias veces por semana: el conteo de Intelligence Index pasó de 57 a 59 entre dos lecturas del mismo día. Cada modelo que sale deja una URL indexada que hay que pasar a `noindex` y después a 404 o a una redirección, y sus enlaces quedan huérfanos. Mantener eso bien exige un registro histórico de modelos que hoy no existe.
3. **El build no ve los datos.** `generateStaticParams` corre en el build. El build corre sin credenciales por diseño: sin `OPENROUTER_API_KEY` lee 0 modelos. Las páginas tendrían que generarse a demanda con ISR. Sin una lista estable, el sitemap solo podría salir del snapshot en tiempo de ejecución, y no hay forma de prerenderizar ni de validar con `seo:check` en local.
4. **Duplica lo que ya rinde.** Las búsquedas por nombre de modelo ("claude prompt", "deepseek prompt guide", "qwen") ya las atienden `/{lang}/models/<familia>` y `/{lang}/guides/<familia>-prompt-guide`, con contenido propio y estable. Una página de benchmarks por variante ("Claude Fable 5.2 (Max, Default Fallback)") competiría con ellas con menos texto.
5. **Nada que inventar.** La política de la página es "nunca datos inventados". Una página por modelo empuja a rellenar con prosa genérica. No queremos esa prosa.

## Lo que sí se hizo para SEO/GEO

- `/{lang}/benchmarks` sigue renderizándose en el servidor con todo su contenido. La sección "Modelos de frontera", con la comparativa rápida de los primeros del Intelligence Index y la matriz, está en el HTML que recibe un rastreador, con nombres, puestos, puntajes y precios en texto. El JSON-LD `Dataset` no cambia.
- El panel y la comparación son interacción sobre los mismos datos. No agregan URLs ni contenido duplicado, y `#m=` no se indexa (el fragmento no llega al servidor).

## Cuándo reconsiderarlo

Propuesta, no implementada. Se podría agregar a cada `/{lang}/models/<familia>` un bloque "En los benchmarks" con los modelos de esa familia del snapshot vigente: puesto y puntaje por benchmark, fecha y fuente, y un enlace a `/{lang}/benchmarks#m=<modelo>`. La URL ya existe y es estable, y el bloque desaparece solo si no hay datos. Suma contenido real a páginas que ya posicionan, sin crear URLs nuevas. Necesita: un componente de servidor que lea `getBenchmarks()`, una prueba de coherencia entre el JSON-LD y lo visible, y que `seo:check` lo cubra.
