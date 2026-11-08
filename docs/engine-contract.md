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
  - `confidence: number` (0..100) — cuánta señal encontró el motor (no es una probabilidad)
  - `optimizedScore: number` (entero 0..100, **v1.8.0 / engine 2.3.0**) — el mismo rubric aplicado al `optimizedPrompt` final (ver §2.I)
  - `optimizedBreakdown` (mismo shape que `scoreBreakdown`, **v1.8.0**)

Campos que agrega la API (`/api/analyze`), fuera del núcleo determinístico:
- `meta.refinement` — resultado de la capa adaptativa (proveedor, modelo, `fallbackReason` tipado).
- `meta.optimizedScore` / `meta.optimizedBreakdown` se **recalculan** cuando el refinado LLM reemplaza al determinístico.
- `meta.judge` (opcional, **v1.8.0**) — segunda opinión LLM; ver §2.J.

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

Casos extremos conocidos (documentados en `docs/engine-audit.md` §4):
- `image_generation`: el optimizado es un prompt de imagen terminado (otro texto, mucho más rico), así que re-analizarlo puntúa como lo que es. Es esperado.
- Pedidos de datos casi vacíos (`"Get the important stuff from these invoices"`): el shape `data_schema` agrega un contrato de salida que el re-análisis acredita.
- Inputs con prompt injection: el optimizado ya no la contiene (ver G), así que el score del re-análisis cambia.

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

Implementación (engine 2.3.0): `neutralizeInjection()` (`lib/engine/sanitize.ts`) elimina **oraciones** de override/exfiltración (no líneas enteras, para conservar el pedido real) del core que se usa para **construir** el optimizado. El análisis (findings, score) sigue viendo el texto original, así que `prompt_injection` y la penalización de safety no cambian. En la capa adaptativa el prompt es DATO, el juez recibe el texto neutralizado, y el quality gate rechaza cualquier candidato que contenga una instrucción de override (`injection_echo` → `unsafe_response`).

### H) Límites y performance
- max input: 12000 chars
- sin IO de red
- runtime objetivo: < 50ms por request (heurístico; depende del deploy)

### I) Score antes → después (engine 2.3.0)
`optimizedScore` aplica el mismo rubric al prompt final, sin re-clasificar (taskType fijo) y sin premiar relleno:
- lo que el optimizado agrega como estructura (formato de salida, restricciones, criterios de éxito, tono, audiencia…) se acredita sobre el texto completo;
- claridad (largo), objetivo y evidencia (inputs, error, pasos de repro) salen solo del **contenido**: el bloque del pedido en un shape estructurado, o el texto entero si es prosa (refinado LLM, prompt de imagen);
- las frases guía de Promptea y los headers legacy no cuentan;
- safety se mide sobre el texto completo;
- prompt sin cambios ⇒ `optimizedScore === score`.

Es puro y sin red (`scoreOptimizedPrompt`, `lib/engine/index.ts`). Re-analizar el optimizado sigue respetando C.

### J) Capas LLM fuera del núcleo
- El núcleo (`analyzePrompt`) es síncrono y no hace IO de red. Toda llamada LLM vive en la API (`lib/refine/**`, `lib/llm/**`).
- Proveedores opcionales: sin claves todo degrada al determinístico con `fallbackReason: "disabled"`. Los fallos de transporte hacen failover al siguiente proveedor; cualquier otro fallo cae al determinístico con un `fallbackReason` tipado.
- **Ninguna capa LLM modifica `score`.** El juez opcional (`PROMPT_JUDGE_ENABLED=1`, solo con `confidence` < `PROMPT_JUDGE_CONFIDENCE_MAX`) agrega `meta.judge = { score, blendedScore, delta, weight: 0.3, maxDelta: 10, rationale, provider, model, trigger }` con `blendedScore = score + clamp(round(0.3 × (judge − score)), −10, +10)`. El `rationale` debe estar en el idioma de la UI y no contener instrucciones de override; si no, no hay `meta.judge`.

---

## 3) Versionado

- `engineVersion` sigue semver (`MAJOR.MINOR.PATCH`)
- MAJOR: cambia IDs o reglas de contrato
- MINOR: agrega heurísticas/findings/recs sin romper compatibilidad (ej. 2.3.0: re-score antes → después, detectores compartidos, fixes de clasificación; ningún ID renombrado)
- PATCH: fixes internos sin impacto visible

---

## 4) Cambio y validación

Antes de mergear cambios en el motor:
- deben pasar tests del extractor (idempotencia)
- deben pasar tests de clasificación / scoring mínimo
- si cambia un finding id: bump MAJOR y actualizar dataset + telemetría