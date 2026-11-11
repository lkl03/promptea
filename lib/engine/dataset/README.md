# Engine Dataset (internal)

Este dataset sirve para calibrar y proteger el motor contra regresiones.
NO guarda prompts reales de usuarios.

## Qué valida
`lib/__tests__/dataset.calibration.test.ts` corre cada caso con `analyzePrompt(prompt, target, lang, purpose)` y verifica **todo** lo que el caso declara (desde v1.8.0; antes los findings y los checks del optimizado se ignoraban en silencio):

- `scoreRange`: rango de score esperado (los casos v1.8.0 usan ±6 alrededor del valor calibrado: un cambio de rubric que mueva el score más que eso hace fallar el test a propósito)
- `confidenceMin`: mínimo de confianza
- `taskType` / `strategy`: tipo de tarea detectado y estrategia del router, exactos
- `mustHaveFindings` / `mustNotHaveFindings`: IDs de findings
- `mustHaveRecommendations` / `mustNotHaveRecommendations`: IDs de recomendaciones
- `mustHaveRecommendationText`: substrings en recomendaciones (legacy)
- `optimizedPromptMustContain` / `optimizedPromptMustNotContain`: checks del prompt final
- `optimizedScoreMin`: piso para `meta.optimizedScore` (el "después")

Además:
- cada propósito (`text, study, code, data, image, marketing, translation, summarization`) tiene un caso `good`, `bad` y `ambiguous` en ES, en EN y en PT (v1.8.2: 24 casos `pt-*-v182`, gemelos de los `es-*-v180`);
- dentro de cada grupo (idioma, propósito) el score debe quedar **ordenado: good > ambiguous > bad**.

## Estructura
```
lib/engine/dataset/
  schema.ts
  load.ts
  cases/
    es/  en/  pt/
      text.jsonl  study.jsonl  code.jsonl  data.jsonl  image.jsonl
      marketing.jsonl  translation.jsonl  summarization.jsonl   ← v1.8.0 (48 casos)
      general.jsonl  debugging.jsonl  data_extraction.jsonl        ← legacy (32 casos, corren bajo purpose "text")
```

Cada archivo es **JSONL**: 1 línea = 1 caso. Campos de un caso: `id, lang, target, purpose, kind, taskType, prompt, expect, notes`.

## Cómo agregar casos
1) Elegí el archivo del propósito (ej: `cases/es/marketing.jsonl`).
2) Agregá una línea JSON por caso; IDs únicos y estables (no cambies IDs ya mergeados).
3) Corré el motor sobre el prompt, revisá que el resultado tenga sentido **antes** de fijarlo (taskType, strategy, findings) y fijá `scoreRange` alrededor del valor observado.

## Si un test falla, ¿qué hago?
- **Score fuera de rango**: el rubric cambió. Si el cambio es intencional, recalibrá el rango y explicalo en el PR; si no, es una regresión.
- **taskType/strategy**: casi siempre es un bug de clasificación o del router — agregá un test de regresión.
- **Findings**: decidí si el motor está bien (ajustás dataset con nota) o si es un falso positivo/negativo (arreglás el motor).
- **Orden good > ambiguous > bad roto**: el rubric dejó de distinguir calidad en ese propósito; no lo tapes ajustando rangos.

## Privacidad
No incluir prompts reales de usuarios.
Si te inspirás en algo real, reescribilo para que sea irreconocible.
