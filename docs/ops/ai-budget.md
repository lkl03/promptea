# Claude en Promptea: tope de gasto y costos (v1.8.9)

Cómo se usa la API de Anthropic sin pasar nunca de USD 100 por mes, qué cuesta cada uso y qué tiene que configurar el dueño.

## 1. Dónde se usa Claude

| Uso | Ruta | Modelo por defecto | ¿Desde cuándo? |
| --- | --- | --- | --- |
| Planificar el **Flujo de prompts** | `POST /api/flow` | Claude Haiku 5.5 (`claude-haiku-5-5`) | v1.8.9 |
| Reescribir el prompt optimizado (refinador) | `POST /api/analyze` | Claude Haiku 5.5, como respaldo de Groq | v1.8.0 |
| Segunda opinión del puntaje (juez, opcional) | `POST /api/analyze` | el mismo de la cadena | v1.8.0, apagado salvo `PROMPT_JUDGE_ENABLED=1` |

Las tres pasan por `lib/ai/claude.ts`, que es el único código que llama a la API. El ruteo de cada paso del flujo a "la mejor IA" **no** usa Claude: lo hace el matcher determinístico de "Elegir la mejor IA".

## 2. Cómo funciona el tope

1. **Clave**: sin `ANTHROPIC_API_KEY` no hay llamadas; con `AI_FEATURES_ENABLED=0` tampoco (interruptor de apagado).
2. **Reserva del peor caso** antes de llamar (`lib/ai/pricing.ts`): cada byte de entrada se cuenta como un token de escritura de caché (la tarifa de entrada más cara) y se suma el `max_tokens` completo de salida (incluye el razonamiento). Un token nunca es menos de un byte, así que el costo real siempre queda por debajo.
3. **Una transacción de Firestore** (`lib/ai/budgetStore.ts`) lee el mes, el día y el contador del visitante y solo reserva si nada se pasa:
   - mes: `AI_MONTHLY_BUDGET_USD` × `AI_BUDGET_SAFETY_RATIO` (por defecto 100 × 0,9 = **USD 90**);
   - día: `AI_DAILY_BUDGET_USD` (por defecto USD 90 ÷ 15 = **USD 6**), para que un día raro no se coma el mes;
   - visitante (hash del IP, nunca el IP) por día UTC: **12 flujos** (`AI_USER_DAILY_LIMIT`) y **40 reescrituras** (`AI_REFINE_USER_DAILY_LIMIT`).
4. **Liquidación** después de la respuesta: se reemplaza la reserva por el costo real que informa `response.usage`. Si Anthropic contestó con error (4xx, 429, 5xx, 529) se devuelve todo, porque no se factura. Si fue un timeout o se cortó la conexión, **queda cobrada la reserva**, porque Anthropic pudo haberla procesado. El libro mayor solo puede contar de más.
5. **Falla cerrado**: si Firestore no está configurado o la transacción falla, no se llama a Claude.
6. **Sin IA para bots**: los crawlers y clientes automatizados (User-Agent) y los pedidos sin cabecera `Origin` reciben el plan básico. `/api/flow` además rechaza pedidos de otros sitios y limita a 6 por minuto por cliente.
7. **Cada llamada** va sin reintentos del SDK, con timeout (25 s el flujo, 10 s el refinador), `max_tokens` acotado (3.500 el flujo, 4.096 el refinador, 400 el juez) y el prompt de sistema estático marcado para caché.

Cuando se corta, la app sigue funcionando: el Flujo muestra el plan básico del motor y un aviso, y el analizador devuelve su versión determinística.

Periodos en UTC, como la facturación de Anthropic. El mes nuevo empieza en cero solo.

## 3. Costos (precios de la API de Anthropic, verificados el 22/11/2026)

| Modelo | Entrada | Salida | Lectura de caché | Escritura de caché (5 min) |
| --- | --- | --- | --- | --- |
| Claude Haiku 5.5 | USD 0,10 / MTok | USD 0,50 / MTok | USD 0,01 | USD 0,125 |
| Claude Sonnet 5.5 | USD 2 / MTok | USD 10 / MTok | USD 0,10 | USD 2,50 |
| Claude Opus 5.5 | USD 4 / MTok | USD 20 / MTok | USD 0,20 | USD 5 |

Haiku 5.5 cobra USD 0,50 / 2,50 si el prompt supera 100.000 tokens; Promptea limita la tarea a 4.000 caracteres, muy por debajo.

**Por flujo (Haiku 5.5, estimado):** ~1.100 tokens de sistema (en caché después del primer pedido de cada 5 minutos), ~300 de tarea y reglas, ~1.500–2.500 de salida. **≈ USD 0,001 por flujo**; el peor caso que se reserva es ≈ USD 0,0025.

| Con USD 90 al mes alcanza para | Haiku 5.5 | Sonnet 5.5 | Opus 5.5 |
| --- | --- | --- | --- |
| Flujos (≈ 2.000 tokens de salida) | ~80.000 | ~4.000 | ~2.000 |
| Reescrituras del analizador (≈ 600 de salida) | ~150.000 | ~9.000 | ~4.500 |

Con el tráfico real de noviembre (~400 visitantes por semana, ~25 análisis por semana) el gasto esperado es **menos de USD 1 por mes**. El tope existe para el caso raro (un pico, un bot que pasa los filtros), no para el uso normal.

**Por qué Haiku 5.5:** dividir una tarea en pasos y escribir prompts claros es trabajo de redacción estructurada, no de razonamiento difícil, y la salida va validada contra un esquema. Haiku cuesta 20 veces menos que Sonnet en salida. Sonnet 5.5 queda como opción (`AI_FLOW_MODEL=claude-sonnet-5-5`) si la calidad no alcanza; Opus no se justifica para esto.

## 4. Dónde más aporta la IA (propuesta)

1. **Refinador del analizador con Claude primero** (`REFINER_PROVIDERS=anthropic,groq`): hoy Claude es solo respaldo de Groq (`llama-3.3-70b`). Con Haiku 5.5 la reescritura cuesta ≈ USD 0,0005 y sigue pasando por el control de calidad. Es la mejora más directa de la función más usada.
2. **Juez para análisis de baja confianza** (`PROMPT_JUDGE_ENABLED=1`): 400 tokens de salida como máximo, solo cuando el motor duda.
3. Más adelante: preguntas de seguimiento con IA en "Elegir la mejor IA", o un flujo que se pueda "afinar" (regenerar un paso). Cada una sumaría una `feature` al libro mayor con su propio cupo por visitante.

## 5. Qué tiene que hacer el dueño

1. **Crear la clave** en console.anthropic.com → API keys, idealmente en un **workspace propio para Promptea**.
2. **Segunda barrera:** en la consola de Anthropic, poner un **límite de gasto mensual** a ese workspace (por ejemplo USD 100) y, si está disponible, una alerta de uso al 50 % y al 80 %. Así, aunque hubiera un error en el código, Anthropic corta antes.
3. **Cargar en Vercel** (Settings → Environment Variables, entorno Production, tipo Sensitive): `ANTHROPIC_API_KEY`. Opcionales, con sus valores por defecto: `AI_MONTHLY_BUDGET_USD=100`, `AI_BUDGET_SAFETY_RATIO=0.9`. Después, **Redeploy**.
4. **Opcional:** en Firestore, una política TTL sobre el campo `expiresAt` de la colección `ai_quota` (Firestore → TTL policies), para que los contadores diarios por visitante se borren solos.
5. **Mirar el gasto:** `curl -H "Authorization: Bearer <ROUTINE_HEALTH_SECRET>" https://www.promptea.me/api/internal/ai/usage`. La factura real está en la consola de Anthropic; el número de Promptea es igual o mayor.

## 6. Datos que se guardan

- `ai_budget/{AAAA-MM}`: gasto en micro-dólares, pedidos, tokens (entrada, salida, caché) por función y por modelo. `ai_budget/{AAAA-MM}/days/{AAAA-MM-DD}`: gasto y pedidos del día.
- `ai_quota/{día}_{función}_{hash}`: un contador por visitante (hash SHA-256 truncado del IP, el mismo de los límites de `/api/analyze`), con `expiresAt` a los 2 días.
- **No** se guarda la tarea, el prompt ni el plan. Anthropic procesa el texto según su política de la API.
