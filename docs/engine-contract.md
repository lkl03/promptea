# PromptEvaluator Engine Contract

**Propósito:** este documento define el *contrato* del motor de análisis/optimización de prompts.  
Es la “ley” del backend: cualquier cambio futuro debe respetar estas reglas para evitar bugs, regressions y resultados inconsistentes.

---

## 1) API contract

### Input (analyzePrompt)
El motor recibe:

- `prompt: string` (1..12000 caracteres)
- `target: "gpt" | "gemini" | "grok" | "claude" | "kimi" | "deepseek"`
- `lang: "es" | "en"`

### Output (AnalyzeResult)
El motor devuelve:

- `score: number` (entero, 0..100)
- `findings: Finding[]`
  - `id: string` (**estable**)
  - `severity: "low" | "medium" | "high"`
  - `title: string` (en idioma `lang`)
  - `description: string` (en idioma `lang`)
  - `fix: string` (en idioma `lang`)
- `recommendations: Recommendation[]`
  - `impact: "low" | "medium" | "high"`
  - `title: string` (en idioma `lang`)
  - `detail: string` (en idioma `lang`)
- `optimizedPrompt: string` (siempre presente)
- `stats: { words: number; approxTokens: number }` (**sobre el core**, no sobre el scaffold)
- `meta`:
  - `engineVersion: string`
  - `target: TargetAI`
  - `taskType: TaskType`
  - `alreadyStructured: boolean`
  - `coreExtracted: boolean`
  - `scoreBreakdown: { clarity; context; constraints; output; verifiability; safety }` (0..100)

---

## 2) Invariantes (no negociables)

### A) Idempotencia
Si el usuario pega `optimizedPrompt` como nuevo input y lo vuelve a analizar:

- el nuevo `optimizedPrompt` **no debe crecer** ni duplicar secciones
- no deben aparecer headers repetidos (ej: `OUTPUT FORMAT` dos veces)

### B) Separación core vs scaffold
El motor debe separar lo que pidió el usuario (core) del scaffold generado.

Reglas:
- `stats.words` y `stats.approxTokens` se calculan sobre el **core**
- el análisis (findings/score) se calcula sobre el **core**

### C) Estabilidad del score al re-analizar el optimizado
Re-analizar `optimizedPrompt` no debería cambiar el score de forma significativa.
Tolerancia sugerida: `±10` puntos salvo casos extremos.

### D) IDs estables
`finding.id` es estable.  
No se renombra sin bump de versión mayor (major).

### E) Localización estricta
Si `lang="es"`:
- no aparecen strings en inglés en el output (títulos, descripciones, fixes, etc.)
Si `lang="en"`:
- no aparecen strings en español.

### F) Robustez ante inputs arbitrarios
Cualquier string válido debe producir resultado válido o error controlado.
Nunca debe crashear.

### G) No amplificación de prompt injection
Si el input contiene líneas tipo “ignore previous instructions”, etc.:
- el motor **no las repite** en el `optimizedPrompt`
- las neutraliza o elimina del core (sanitiza)

### H) Límites y performance
- max input: 12000 chars
- sin IO de red
- runtime objetivo: < 50ms por request (heurístico; depende del deploy)

---

## 3) Versionado

- `engineVersion` sigue semver (`MAJOR.MINOR.PATCH`)
- MAJOR: cambia IDs o reglas de contrato
- MINOR: agrega heurísticas/findings/recs sin romper compatibilidad
- PATCH: fixes internos sin impacto visible

---

## 4) Cambio y validación

Antes de mergear cambios en el motor:
- deben pasar tests del extractor (idempotencia)
- deben pasar tests de clasificación / scoring mínimo
- si cambia un finding id: bump MAJOR y actualizar dataset + telemetría