# Engine Dataset (internal)

Este dataset sirve para calibrar y proteger el motor contra regresiones.
NO guarda prompts reales de usuarios.

## Qué valida
Los tests en `lib/__tests__/dataset.calibration.test.ts` validan de forma NO frágil:

- `scoreRange`: rango de score esperado (siempre usar)
- `confidenceMin`: mínimo de confianza
- `mustHaveFindings` / `mustNotHaveFindings`: IDs de findings (cuando son estables)
- `mustHaveRecommendationText`: substrings en recomendaciones (más estable que IDs hoy)
- `optimizedPromptMustContain` / `optimizedPromptMustNotContain`: checks simples del prompt final

## Filosofía: preferimos rangos y substrings antes que asserts exactos.

## Estructura

## Estructura
lib/engine/dataset/
    schema.ts
    load.ts
    cases/
    es/
        general.jsonl
        debugging.jsonl
        data_extraction.jsonl
    en/
        general.jsonl
        debugging.jsonl
        data_extraction.jsonl


Cada archivo es **JSONL**: 1 línea = 1 caso.


## Cómo agregar casos
1) Elegí un archivo (ej: `cases/es/general.jsonl`)
2) Agregá una línea JSON por caso (JSONL)
3) Usá IDs únicos y estables (no cambies IDs ya mergeados)

### Recomendación para `expect.scoreRange`
Arrancá con rangos amplios:
- Malo/corto: [0, 55]
- Medio: [25, 75]
- Bueno: [55, 95]

Luego, cuando el motor mejore, **tighten** los rangos.

## Si un test falla, ¿qué hago?
Primero mirá el mensaje:
- Si falla por IDs (ej: `missing_context` vs `missing_goal`), decidí:
  - si el motor está bien → ajustás dataset
  - si querés estandarizar IDs → lo hacemos en Paso 6 (linting fuerte)
- Si falla por score, ajustá rango (Paso 5) o recalibrá scoring (Paso 4/6)

## Privacidad
No incluir prompts reales de usuarios.
Si te inspirás en algo real, reescribilo para que sea irreconocible.
