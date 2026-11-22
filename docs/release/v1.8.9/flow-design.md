# Flujo de prompts: de dónde sale y por qué así (v1.8.9)

## 1. Qué es Orca

El post de LinkedIn que sirvió de punto de partida (de Gal Gordon, Engineering Team Lead en Luxury Presence) cuenta cómo usa **Orca** (onorca.dev, que hoy redirige a orca.dev) para correr agentes de programación en paralelo.

**Orca** es un "entorno de desarrollo para agentes" (*agent development environment*, ADE):
- es de código abierto (MIT) y gratis, hecho por Stably AI, una empresa de Y Combinator;
- corre en macOS, Windows y Linux;
- no es un modelo: es una app de escritorio que corre Claude Code, Codex, Gemini, Grok, OpenCode y unos 27 agentes de línea de comandos, **cada uno en su propio git worktree**, para que varios trabajen sobre el mismo repo sin pisarse;
- tiene **agentes coordinadores que lanzan agentes "trabajadores"**. En la demo de su sitio, una tarea ("Fix ACME-412") se reparte entre un trabajador en Codex (`tax-rules`) y otro en Grok (`promo-tests`). Cada trabajador muestra "Task from coordinator" y al final el coordinador pregunta "Both workers are done. Open the PR?";
- suma terminal, navegador embebido, revisión de diffs, automatizaciones programadas, app móvil y bots que reciben trabajos desde Slack, Linear o GitHub.

En el post, Gal agrega encima una "skill de orquestación" con tres reglas:
1. planificar con un modelo fuerte y dividir el trabajo en tareas chicas, en paralelo o en secuencia;
2. **asignar cada sub-tarea al modelo que mejor le queda** (Kimi, GPT, Gemini, Grok);
3. dejar el contexto general en el orquestador y darle a cada sub-agente solo instrucciones acotadas.

La imagen del post muestra la interfaz que le gustó al dueño:
- arriba, un nodo "Orchestration Plan" con el modelo que planifica;
- debajo, tres columnas, una por agente, cada una con su modelo, su flujo de trabajo y su tarea, unidas al plan por líneas, como un organigrama.

## 2. Qué tomamos y qué no

**Tomamos el patrón de interacción:**
- una tarea principal arriba que se ramifica hacia abajo en sub-tareas;
- las ramas que no dependen entre sí van lado a lado, en paralelo; las que dependen van debajo;
- cada rama tiene asignado el modelo que mejor le queda;
- cada rama recibe instrucciones acotadas y autocontenidas;
- un progreso visible de qué está hecho.

**No tomamos** el nombre, la marca, el logo, los textos, los colores, la tipografía ni el aspecto de Orca: la vista oscura de terminal, los paneles de agente ni el "Orchestration Plan". El árbol de Promptea usa sus propios tokens y componentes (`surface`, `badge`, `btn`), funciona con los tres temas y en modo claro y oscuro, y se llama "Flujo de prompts".

**La diferencia de fondo:** Orca ejecuta agentes. Promptea no ejecuta nada: escribe los prompts de cada paso para que la persona los corra en la IA que prefiera. Ese es el producto de Promptea.

## 3. Opciones evaluadas

| Opción | Qué hace | A favor | En contra |
| --- | --- | --- | --- |
| A. Variantes por modelo | Un prompt → una versión para cada IA | Fácil; el motor ya optimiza por destino | Es lo que ya hace el analizador con el selector de destino: no aporta un producto nuevo ni la idea de "ramificar" |
| B. Cadena lineal | Paso 1 → paso 2 → … | Simple de usar | Pierde lo que le gustó al dueño: las ramas en paralelo |
| **C. Descomponer en un árbol de sub-prompts con ruteo por paso** | Tarea principal → pasos con dependencias, algunos en paralelo, cada uno con su prompt y la mejor IA | Es el patrón de la imagen (plan arriba, ramas abajo, un modelo por rama) aplicado a prompts. Reutiliza el matcher de "Elegir la mejor IA" para el ruteo, sin costo de IA, y lleva cada paso al analizador | Necesita un LLM para descomponer bien. Lo resolvemos con Claude Haiku 5.5 bajo un tope de gasto y un plan básico sin IA de respaldo |

**Elegida: C.** Incluye a B (una cadena es un árbol sin ramas) y conecta las tres herramientas: el flujo arma los pasos, "Elegir la mejor IA" rutea cada uno y el analizador mejora el que el usuario elija.

## 4. Cómo funciona

1. El usuario escribe la tarea principal (12 a 4.000 caracteres) en `/[lang]/flow`, el tercer modo del selector.
2. `POST /api/flow` → `lib/flow/plan.ts`:
   - **Claude Haiku 5.5** devuelve un JSON validado por esquema: `summary` y 2 a 6 `steps`, cada uno con `title`, `goal`, `prompt`, `output` y `dependsOn`;
   - el prompt de sistema es estático y queda en caché;
   - la tarea va marcada como dato, no como instrucción, y se le quitan antes las frases de inyección.
3. `lib/flow/layout.ts` limpia las dependencias: solo se puede depender de pasos anteriores, así que no hay ciclos. También calcula los niveles: los pasos de un mismo nivel van en paralelo.
4. `lib/flow/route.ts`: cada paso, con el comienzo de la tarea como contexto, pasa por el matcher determinístico y recibe la IA recomendada, el modelo, el motivo y el propósito para el analizador.
5. **Sin IA** (no hay clave, se llegó al tope, se usó el cupo del día, el proveedor falla, la respuesta no sirve o el pedido viene de un bot), `lib/flow/basic.ts` arma un plan con una de cuatro plantillas: código, escritura, investigación o general. Cada plantilla tiene una rama en paralelo, y la página dice por qué es el plan básico.
6. **La vista** (`components/flow/`):
   - arriba, la tarea principal, con quién la planificó, cuántos pasos hay, cuántos van en paralelo y el progreso;
   - debajo, una fila por nivel, unida por conectores CSS: un tronco, un bus horizontal y bajadas a cada tarjeta, y un bus de unión cuando las ramas se juntan;
   - cada tarjeta tiene el número del paso, el título, el objetivo, la mejor IA con su motivo, de qué pasos usa el resultado, el prompt desplegable, qué entrega, y los botones Copiar, Mejorar en el analizador y Hecho;
   - "Copiar el flujo" exporta todo en Markdown.

## 5. Viabilidad

- **Técnica:**
  - no suma infraestructura: Firestore ya existía para el libro mayor y el SDK de Anthropic ya era dependencia (v1.8.0);
  - la página se prerenderiza en los 4 idiomas; solo el pedido es dinámico;
  - el ruteo es el matcher existente y el handoff al analizador es el contrato existente (`promptea:handoff`).
- **Costo:** ≈ USD 0,001 por flujo con Haiku 5.5, y el peor caso reservado es ≈ USD 0,0025. Con el tráfico de noviembre, menos de USD 1 por mes. El tope de USD 90 alcanzaría para unos 80.000 flujos (detalle en [`docs/ops/ai-budget.md`](../../ops/ai-budget.md)).
- **Riesgo de abuso:** acotado por varias capas:
  - mismo origen, 6 pedidos por minuto por cliente, nada de IA para bots;
  - 12 flujos con IA por visitante y por día, USD 6 por día y USD 90 por mes;
  - pasado el tope, plan básico.

## 6. Pendiente o posible después

- Regenerar o afinar un solo paso ("dividir este paso en dos").
- Guardar un flujo en la Biblioteca.
- Un ejemplo prearmado por guía (por ejemplo, la guía de encadenar prompts podría abrir el flujo con su ejemplo).
- Medir con `Flow Created {source}` cuántos flujos son con IA y cuántos básicos, y con `Template Copied {source: "flow"}` si la gente usa los pasos.
