// lib/seo/content/chineseModels.ts
//
// v1.8.6 — model pages and prompt guides for Qwen (Alibaba Cloud), GLM (Z.ai /
// Zhipu AI), MiniMax and Doubao (ByteDance / Volcengine Ark), built the same way
// as the Kimi and DeepSeek ones. Every product fact here comes from the
// provider's own documentation, checked on 2026-11-14 (the registry entries in
// lib/models.ts carry the exact source URL of each model):
//
//   Qwen     alibabacloud.com/help/en/model-studio (models, prompt-engineering-guide,
//            deep-thinking, json-mode, web-search)
//   GLM      docs.z.ai (glm-5.3, glm-5.3-flash, struct-output) and
//            docs.bigmodel.cn/cn/best-practice/prompt-engineering-general
//   MiniMax  platform.minimax.io/docs (models-intro, text-m3-function-call)
//   Doubao   docs.volcengine.com/docs/82379/1330310 (models) and
//            docs/ark/deep-thinking, docs/ark/structured-output-beta
//
// Guides are written in English and Spanish; Portuguese readers get the English
// text (guideLang() falls back when the pt title equals the en one), like other
// guides that are not translated yet.

import type { Guide } from "./guides";
import type { ModelPage } from "./models";

type L = { en: string; es: string; pt: string };
/** English + Spanish; Portuguese shows the English original (see guideLang). */
const enEs = (en: string, es: string): L => ({ en, es, pt: en });
const enEsList = (en: string[], es: string[]) => ({ en, es, pt: en });

const UPDATED = "2026-11-14";

// ---------------------------------------------------------------------------
// Model pages (/models/<slug>), all three languages
// ---------------------------------------------------------------------------

export const CHINESE_MODEL_PAGES: ModelPage[] = [
  {
    slug: "qwen",
    title: {
      en: "Prompts for Qwen: clear sections, delimiters and one example",
      es: "Prompts para Qwen: secciones claras, delimitadores y un ejemplo",
      pt: "Prompts para Qwen: seções claras, delimitadores e um exemplo",
    },
    description: {
      en: "How to prompt Qwen3.8 Max, Qwen3.7 Plus and Qwen3.8 Flash on Alibaba Cloud Model Studio: the section framework Alibaba recommends, ### delimiters, examples and JSON mode.",
      es: "Cómo promptear Qwen3.8 Max, Qwen3.7 Plus y Qwen3.8 Flash en Alibaba Cloud Model Studio: el esquema de secciones que recomienda Alibaba, delimitadores ###, ejemplos y modo JSON.",
      pt: "Como escrever prompts para Qwen3.8 Max, Qwen3.7 Plus e Qwen3.8 Flash no Alibaba Cloud Model Studio: o esquema de seções que a Alibaba recomenda, delimitadores ###, exemplos e modo JSON.",
    },
    bullets: {
      en: [
        "Alibaba's prompt guide suggests six parts: context, objective, style, tone, audience and response (the exact output form). Drop the ones a task does not need.",
        "Mark blocks of material with distinctive delimiters such as ### or ===, so the model can tell instructions from the text it should work on.",
        "Add an example of the output when you can: Alibaba says examples make answers more consistent, and a format template plus sample data works best for structured output.",
        "For JSON mode (json_object) the word 'JSON' must appear in the prompt or the API returns an error; json_schema with strict enforces a schema.",
      ],
      es: [
        "La guía de prompts de Alibaba propone seis partes: contexto, objetivo, estilo, tono, audiencia y respuesta (la forma exacta de la salida). Sacá las que la tarea no necesita.",
        "Marcá los bloques de material con delimitadores bien distintos como ### o ===, para que el modelo distinga las instrucciones del texto sobre el que trabaja.",
        "Sumá un ejemplo de la salida cuando puedas: según Alibaba, los ejemplos hacen las respuestas más consistentes, y para salida estructurada lo que mejor funciona es una plantilla de formato con datos de ejemplo.",
        "En modo JSON (json_object) la palabra 'JSON' tiene que aparecer en el prompt o la API devuelve un error; json_schema con strict obliga a respetar un esquema.",
      ],
      pt: [
        "O guia de prompts da Alibaba propõe seis partes: contexto, objetivo, estilo, tom, público e resposta (o formato exato da saída). Tire as que a tarefa não precisa.",
        "Marque os blocos de material com delimitadores bem distintos, como ### ou ===, para o modelo separar as instruções do texto em que vai trabalhar.",
        "Inclua um exemplo da saída quando puder: segundo a Alibaba, exemplos deixam as respostas mais consistentes, e para saída estruturada o que funciona melhor é um modelo de formato com dados de exemplo.",
        "No modo JSON (json_object) a palavra 'JSON' precisa aparecer no prompt, senão a API retorna erro; json_schema com strict obriga a seguir um esquema.",
      ],
    },
    templates: [
      {
        title: { en: "Six-part brief", es: "Brief en seis partes", pt: "Briefing em seis partes" },
        purpose: "text",
        prompt: {
          en: `### Context
[background the model needs]
### Objective
[the one task to complete]
### Style
[e.g. a product manager's status note]
### Tone
[e.g. plain, direct]
### Audience
[who reads it and what they already know]
### Response
[exact format: e.g. 5 bullets, max 15 words each]`,
          es: `### Contexto
[lo que el modelo necesita saber]
### Objetivo
[la única tarea a completar]
### Estilo
[ej.: nota de estado de un product manager]
### Tono
[ej.: simple, directo]
### Audiencia
[quién lo lee y qué sabe ya]
### Respuesta
[formato exacto: ej. 5 viñetas, máximo 15 palabras cada una]`,
          pt: `### Contexto
[o que o modelo precisa saber]
### Objetivo
[a única tarefa a cumprir]
### Estilo
[ex.: nota de status de um product manager]
### Tom
[ex.: simples, direto]
### Público
[quem lê e o que já sabe]
### Resposta
[formato exato: ex. 5 tópicos, no máximo 15 palavras cada]`,
        },
      },
      {
        title: { en: "JSON extraction (json_object mode)", es: "Extracción a JSON (modo json_object)", pt: "Extração para JSON (modo json_object)" },
        purpose: "data",
        prompt: {
          en: `Extract the fields below from the text and return JSON only.
Fields: "name" (string), "company" (string or null), "email" (string or null).
If a field is missing, use null; do not guess.
Example: {"name": "Ana Ruiz", "company": "Tasklight", "email": null}
###
[paste the text here]
###`,
          es: `Extraé los campos de abajo del texto y devolvé solo JSON.
Campos: "name" (string), "company" (string o null), "email" (string o null).
Si falta un campo, usá null; no adivines.
Ejemplo: {"name": "Ana Ruiz", "company": "Tasklight", "email": null}
###
[pegá el texto acá]
###`,
          pt: `Extraia os campos abaixo do texto e retorne só JSON.
Campos: "name" (string), "company" (string ou null), "email" (string ou null).
Se faltar um campo, use null; não invente.
Exemplo: {"name": "Ana Ruiz", "company": "Tasklight", "email": null}
###
[cole o texto aqui]
###`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Which Qwen model should I pick?", es: "¿Qué modelo de Qwen elijo?", pt: "Qual modelo do Qwen eu escolho?" },
        a: {
          en: "Alibaba calls Qwen3.7 Plus the recommended starting point (capability and cost in balance). Use Qwen3.8 Max for the hardest reasoning and long multimodal inputs, and Qwen3.8 Flash for short, high-volume tasks.",
          es: "Alibaba presenta a Qwen3.7 Plus como el punto de partida recomendado (equilibra capacidad y costo). Usá Qwen3.8 Max para el razonamiento más difícil y entradas multimodales largas, y Qwen3.8 Flash para tareas cortas de alto volumen.",
          pt: "A Alibaba apresenta o Qwen3.7 Plus como o ponto de partida recomendado (equilibra capacidade e custo). Use o Qwen3.8 Max para o raciocínio mais difícil e entradas multimodais longas, e o Qwen3.8 Flash para tarefas curtas e de alto volume.",
        },
      },
      {
        q: { en: "Should I turn thinking off?", es: "¿Conviene apagar el razonamiento?", pt: "Vale a pena desligar o raciocínio?" },
        a: {
          en: "Thinking is on by default. Turn it off (enable_thinking: false) for quick, simple answers, or cap it with thinking_budget; keep it on for reasoning, math and code.",
          es: "El razonamiento viene activado. Apagalo (enable_thinking: false) para respuestas simples y rápidas, o limitalo con thinking_budget; dejalo activo para razonamiento, matemática y código.",
          pt: "O raciocínio vem ligado. Desligue (enable_thinking: false) para respostas simples e rápidas, ou limite com thinking_budget; deixe ligado para raciocínio, matemática e código.",
        },
      },
    ],
  },
  {
    slug: "glm",
    title: {
      en: "Prompts for GLM: constraints first, no inflated roles",
      es: "Prompts para GLM: restricciones primero, sin roles inflados",
      pt: "Prompts para GLM: restrições primeiro, sem papéis inflados",
    },
    description: {
      en: "How to prompt GLM-5.3 and GLM-5.3 Flash from Z.ai (Zhipu AI): always-on reasoning, key constraints early, roles that serve the task and JSON with explicit fields.",
      es: "Cómo promptear GLM-5.3 y GLM-5.3 Flash de Z.ai (Zhipu AI): razonamiento siempre activo, restricciones clave al principio, roles al servicio de la tarea y JSON con campos explícitos.",
      pt: "Como escrever prompts para GLM-5.3 e GLM-5.3 Flash da Z.ai (Zhipu AI): raciocínio sempre ligado, restrições-chave no começo, papéis a serviço da tarefa e JSON com campos explícitos.",
    },
    bullets: {
      en: [
        "Zhipu's prompt guide says to give the important constraints you already know as early as possible, not as an afterthought at the end.",
        "A role should serve the task: skip titles like 'world-class expert'. A role does not replace the task description, the source material or the criteria to check the answer.",
        "Use tags or delimiters named after what they contain, consistently, so the model separates the rules it must follow from the material it must process.",
        "GLM-5.3 always reasons and takes text only; choose reasoning_effort (low, high or max). GLM-5.3 Flash also reads images and video.",
      ],
      es: [
        "La guía de prompts de Zhipu dice que des las restricciones importantes que ya conocés lo antes posible, no como un agregado al final.",
        "Un rol tiene que servir a la tarea: evitá títulos como 'experto de nivel mundial'. El rol no reemplaza la descripción de la tarea, el material fuente ni los criterios para verificar la respuesta.",
        "Usá etiquetas o delimitadores con el nombre de lo que contienen, siempre iguales, para que el modelo separe las reglas que debe seguir del material que debe procesar.",
        "GLM-5.3 siempre razona y acepta solo texto; elegí reasoning_effort (low, high o max). GLM-5.3 Flash además lee imágenes y video.",
      ],
      pt: [
        "O guia de prompts da Zhipu diz para dar as restrições importantes que você já conhece o mais cedo possível, e não como um acréscimo no final.",
        "Um papel deve servir à tarefa: evite títulos como 'especialista de nível mundial'. O papel não substitui a descrição da tarefa, o material-fonte nem os critérios para conferir a resposta.",
        "Use tags ou delimitadores com o nome do que contêm, sempre iguais, para o modelo separar as regras que deve seguir do material que deve processar.",
        "O GLM-5.3 sempre raciocina e aceita só texto; escolha reasoning_effort (low, high ou max). O GLM-5.3 Flash também lê imagens e vídeo.",
      ],
    },
    templates: [
      {
        title: { en: "Constraints-first task", es: "Tarea con restricciones primero", pt: "Tarefa com restrições primeiro" },
        purpose: "text",
        prompt: {
          en: `Constraints (apply to everything below):
- Audience: [who]
- Length: [limit]
- Must not: [what to avoid]

Task: [what to produce]

<source>
[material to work on]
</source>

Done when: [how to check the answer]`,
          es: `Restricciones (valen para todo lo que sigue):
- Audiencia: [quién]
- Largo: [límite]
- No debe: [qué evitar]

Tarea: [qué producir]

<fuente>
[material sobre el que trabajar]
</fuente>

Listo cuando: [cómo verificar la respuesta]`,
          pt: `Restrições (valem para tudo o que vem abaixo):
- Público: [quem]
- Tamanho: [limite]
- Não deve: [o que evitar]

Tarefa: [o que produzir]

<fonte>
[material a ser trabalhado]
</fonte>

Pronto quando: [como conferir a resposta]`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Can I turn GLM-5.3's reasoning off?", es: "¿Se puede apagar el razonamiento de GLM-5.3?", pt: "Dá para desligar o raciocínio do GLM-5.3?" },
        a: {
          en: "No. Z.ai's docs say disabling reasoning is no longer supported; set reasoning_effort to low for quick tasks instead (the default is max).",
          es: "No. La documentación de Z.ai dice que ya no se puede desactivar; para tareas rápidas poné reasoning_effort en low (el valor por defecto es max).",
          pt: "Não. A documentação da Z.ai diz que não é mais possível desativar; para tarefas rápidas use reasoning_effort low (o padrão é max).",
        },
      },
      {
        q: { en: "Is asking for 'JSON' enough?", es: "¿Alcanza con pedir 'JSON'?", pt: "Basta pedir 'JSON'?" },
        a: {
          en: "No. Zhipu's guide asks you to define the structure, what each field means and which values it allows, and to keep validating the result in your application.",
          es: "No. La guía de Zhipu pide definir la estructura, qué significa cada campo y qué valores admite, y seguir validando el resultado en tu aplicación.",
          pt: "Não. O guia da Zhipu pede para definir a estrutura, o que cada campo significa e quais valores aceita, e continuar validando o resultado na sua aplicação.",
        },
      },
    ],
  },
  {
    slug: "minimax",
    title: {
      en: "Prompts for MiniMax: coding and agent tasks with clear checks",
      es: "Prompts para MiniMax: código y agentes con verificaciones claras",
      pt: "Prompts para MiniMax: código e agentes com verificações claras",
    },
    description: {
      en: "How to prompt MiniMax-M3 and MiniMax-M3.1 Flash: frontier coding models with 1M context, fixed sampling, and tool loops that must send the full response back.",
      es: "Cómo promptear MiniMax-M3 y MiniMax-M3.1 Flash: modelos de código de frontera con contexto de 1M, muestreo fijo y loops de herramientas que deben devolver la respuesta completa.",
      pt: "Como escrever prompts para MiniMax-M3 e MiniMax-M3.1 Flash: modelos de código de ponta com contexto de 1M, amostragem fixa e loops de ferramentas que devem devolver a resposta completa.",
    },
    bullets: {
      en: [
        "MiniMax presents both models as frontier coding models: give repository context, concrete acceptance criteria and the command that proves the change works.",
        "Temperature and top_p are fixed (MiniMax always uses 1 and 0.95), so steer the output with instructions, not sampling settings.",
        "MiniMax documents no JSON mode: when you need JSON, describe the exact shape with an example and ask for the JSON only.",
        "In tool-calling loops, send the model's full response back on every turn, reasoning_content included.",
      ],
      es: [
        "MiniMax presenta los dos modelos como modelos de código de frontera: dales contexto del repositorio, criterios de aceptación concretos y el comando que prueba que el cambio funciona.",
        "La temperatura y top_p están fijos (MiniMax siempre usa 1 y 0.95), así que guiá la salida con instrucciones, no con parámetros de muestreo.",
        "MiniMax no documenta un modo JSON: si necesitás JSON, describí la forma exacta con un ejemplo y pedí solo el JSON.",
        "En loops con herramientas, devolvé la respuesta completa del modelo en cada turno, reasoning_content incluido.",
      ],
      pt: [
        "A MiniMax apresenta os dois modelos como modelos de código de ponta: dê o contexto do repositório, critérios de aceitação concretos e o comando que prova que a mudança funciona.",
        "A temperatura e o top_p são fixos (a MiniMax sempre usa 1 e 0.95), então conduza a saída com instruções, não com parâmetros de amostragem.",
        "A MiniMax não documenta um modo JSON: se você precisar de JSON, descreva o formato exato com um exemplo e peça só o JSON.",
        "Em loops com ferramentas, devolva a resposta completa do modelo a cada turno, incluindo o reasoning_content.",
      ],
    },
    templates: [
      {
        title: { en: "Agent coding task", es: "Tarea de código para un agente", pt: "Tarefa de código para um agente" },
        purpose: "code",
        prompt: {
          en: `Goal: [the change, in one sentence]
Repository context: [relevant files and how they connect]
Acceptance criteria:
- [observable behavior 1]
- [observable behavior 2]
Verify with: [test command]
Constraints: [what must not change]
When done: report the diff summary and anything left unverified.`,
          es: `Objetivo: [el cambio, en una oración]
Contexto del repositorio: [archivos relevantes y cómo se conectan]
Criterios de aceptación:
- [comportamiento observable 1]
- [comportamiento observable 2]
Verificá con: [comando de tests]
Restricciones: [qué no debe cambiar]
Al terminar: resumí el diff y decí qué quedó sin verificar.`,
          pt: `Objetivo: [a mudança, em uma frase]
Contexto do repositório: [arquivos relevantes e como se conectam]
Critérios de aceitação:
- [comportamento observável 1]
- [comportamento observável 2]
Verifique com: [comando de testes]
Restrições: [o que não pode mudar]
Ao terminar: resuma o diff e diga o que ficou sem verificar.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Which MiniMax model should I use?", es: "¿Qué modelo de MiniMax uso?", pt: "Qual modelo da MiniMax eu uso?" },
        a: {
          en: "MiniMax-M3 is the flagship and can turn thinking off; MiniMax-M3.1 Flash is the faster option, always reasons and lets you tune the depth with reasoning_effort. MiniMax-M2.5 and M2.7 retire on 2026-11-18.",
          es: "MiniMax-M3 es el modelo insignia y permite apagar el razonamiento; MiniMax-M3.1 Flash es la opción más rápida, siempre razona y deja ajustar la profundidad con reasoning_effort. MiniMax-M2.5 y M2.7 se retiran el 2026-11-18.",
          pt: "O MiniMax-M3 é o modelo principal e permite desligar o raciocínio; o MiniMax-M3.1 Flash é a opção mais rápida, sempre raciocina e deixa ajustar a profundidade com reasoning_effort. O MiniMax-M2.5 e o M2.7 serão aposentados em 18/11/2026.",
        },
      },
    ],
  },
  {
    slug: "doubao",
    title: {
      en: "Prompts for Doubao: goal and scenario, not step-by-step",
      es: "Prompts para Doubao: objetivo y escenario, no paso a paso",
      pt: "Prompts para Doubao: objetivo e cenário, não passo a passo",
    },
    description: {
      en: "How to prompt Doubao Seed 2.1 (Pro, Lite, Turbo) on ByteDance's Volcengine Ark: give the goal and scenario, avoid step-by-step decomposition, put instructions in the user message and raise max_tokens.",
      es: "Cómo promptear Doubao Seed 2.1 (Pro, Lite, Turbo) en Volcengine Ark de ByteDance: dar objetivo y escenario, evitar descomponer en pasos, poner las instrucciones en el mensaje del usuario y subir max_tokens.",
      pt: "Como escrever prompts para Doubao Seed 2.1 (Pro, Lite, Turbo) no Volcengine Ark da ByteDance: dar objetivo e cenário, evitar decompor em passos, pôr as instruções na mensagem do usuário e aumentar max_tokens.",
    },
    bullets: {
      en: [
        "Volcengine's guide for reasoning models says to add the goal and the scenario (who it is for, what it is used for, what a good outcome is) to the problem itself.",
        "It also says to reduce or avoid breaking the problem into steps or giving examples: with thinking on, that limits the model's own reasoning.",
        "Use fewer system prompts: send the prompt information as the user message.",
        "Default max output is 4K tokens: raise max_tokens for long answers. For JSON (beta), json_object needs the word 'json' in the input; json_schema with strict enforces a schema.",
      ],
      es: [
        "La guía de Volcengine para modelos con razonamiento dice que sumes al problema el objetivo y el escenario (para quién es, para qué se usa, cómo se ve un buen resultado).",
        "También dice que reduzcas o evites descomponer el problema en pasos o dar ejemplos: con el razonamiento activo, eso limita la lógica propia del modelo.",
        "Usá menos prompts de sistema: mandá la información del prompt como mensaje del usuario.",
        "La salida máxima por defecto es de 4K tokens: subí max_tokens para respuestas largas. Para JSON (beta), json_object necesita la palabra 'json' en la entrada; json_schema con strict obliga a respetar un esquema.",
      ],
      pt: [
        "O guia da Volcengine para modelos com raciocínio diz para acrescentar ao problema o objetivo e o cenário (para quem é, para que será usado, como é um bom resultado).",
        "Também diz para reduzir ou evitar decompor o problema em passos ou dar exemplos: com o raciocínio ligado, isso limita a lógica do próprio modelo.",
        "Use menos prompts de sistema: mande as informações do prompt como mensagem do usuário.",
        "A saída máxima padrão é de 4K tokens: aumente max_tokens para respostas longas. Para JSON (beta), json_object precisa da palavra 'json' na entrada; json_schema com strict obriga a seguir um esquema.",
      ],
    },
    templates: [
      {
        title: { en: "Goal + scenario request", es: "Pedido con objetivo + escenario", pt: "Pedido com objetivo + cenário" },
        purpose: "text",
        prompt: {
          en: `Problem: [what you need]
Goal: [what a good result lets you do]
Scenario: [who will use it, where and when]
Audience: [who reads it and what they already know]
Constraints: [length, tone, must-nots]
Output format: [exact shape]`,
          es: `Problema: [qué necesitás]
Objetivo: [qué te permite hacer un buen resultado]
Escenario: [quién lo va a usar, dónde y cuándo]
Audiencia: [quién lo lee y qué sabe ya]
Restricciones: [largo, tono, lo que no debe hacer]
Formato de salida: [forma exacta]`,
          pt: `Problema: [o que você precisa]
Objetivo: [o que um bom resultado permite fazer]
Cenário: [quem vai usar, onde e quando]
Público: [quem lê e o que já sabe]
Restrições: [tamanho, tom, o que não fazer]
Formato de saída: [formato exato]`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Doubao or Dola Seed?", es: "¿Doubao o Dola Seed?", pt: "Doubao ou Dola Seed?" },
        a: {
          en: "The same family under two brands: Doubao on Volcengine Ark (China), Dola Seed on BytePlus ModelArk (international). Promptea lists the Volcengine model ids.",
          es: "La misma familia con dos marcas: Doubao en Volcengine Ark (China) y Dola Seed en BytePlus ModelArk (internacional). Promptea lista los ids de modelo de Volcengine.",
          pt: "A mesma família com duas marcas: Doubao no Volcengine Ark (China) e Dola Seed no BytePlus ModelArk (internacional). O Promptea lista os ids de modelo da Volcengine.",
        },
      },
      {
        q: { en: "Why is my Doubao answer cut short?", es: "¿Por qué la respuesta de Doubao sale cortada?", pt: "Por que a resposta do Doubao sai cortada?" },
        a: {
          en: "The default max output is 4K tokens even though the models allow up to 256K. Set max_tokens explicitly for long answers.",
          es: "La salida máxima por defecto es de 4K tokens aunque los modelos admiten hasta 256K. Fijá max_tokens a mano para respuestas largas.",
          pt: "A saída máxima padrão é de 4K tokens, embora os modelos aceitem até 256K. Defina max_tokens explicitamente para respostas longas.",
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Guides (/guides/<family>-prompt-guide), English + Spanish
// ---------------------------------------------------------------------------

export const CHINESE_MODEL_GUIDES: Guide[] = [
  {
    slug: "qwen-prompt-guide",
    updated: UPDATED,
    title: enEs(
      "Qwen prompt guide: Alibaba's six-part framework, delimiters and JSON mode",
      "Guía de prompts para Qwen: el esquema de seis partes de Alibaba, delimitadores y modo JSON",
    ),
    description: enEs(
      "How to write prompts for Qwen3.8 Max, Qwen3.7 Plus and Qwen3.8 Flash, following Alibaba Cloud Model Studio's own prompt guide and API docs.",
      "Cómo escribir prompts para Qwen3.8 Max, Qwen3.7 Plus y Qwen3.8 Flash siguiendo la guía de prompts y la documentación de la API de Alibaba Cloud Model Studio.",
    ),
    sections: [
      {
        heading: enEs("What Alibaba recommends", "Qué recomienda Alibaba"),
        bullets: enEsList(
          [
            "Build the prompt from six parts: context, objective, style, tone, audience and response. Each one answers a question the model would otherwise guess; leave out the ones the task does not need.",
            "Response is the exact output form: a list, a table, JSON with named fields, a word limit.",
            "Separate blocks of material with distinctive markers such as ### or ===, so the boundaries are unmistakable.",
            "Give examples when the format matters: they let the model imitate the format, terms and tone, and make answers more consistent. For structured output, pair a format template with sample data.",
          ],
          [
            "Armá el prompt con seis partes: contexto, objetivo, estilo, tono, audiencia y respuesta. Cada una responde algo que el modelo tendría que adivinar; dejá afuera las que la tarea no necesita.",
            "Respuesta es la forma exacta de la salida: una lista, una tabla, JSON con campos con nombre, un límite de palabras.",
            "Separá los bloques de material con marcadores bien distintos como ### o ===, para que los límites no se confundan.",
            "Dá ejemplos cuando importa el formato: permiten que el modelo imite el formato, los términos y el tono, y hacen las respuestas más consistentes. Para salida estructurada, combiná una plantilla de formato con datos de ejemplo.",
          ],
        ),
      },
      {
        heading: enEs("Settings that change the prompt", "Ajustes que cambian el prompt"),
        bullets: enEsList(
          [
            "Thinking is on by default on Qwen3.8 Max, Qwen3.7 Plus and Qwen3.8 Flash. Turn it off with enable_thinking for quick answers, or cap it with thinking_budget.",
            "JSON mode: with response_format json_object, the word 'JSON' must appear in the prompt or the request fails. json_schema with strict enforces a schema.",
            "Web search is a parameter (enable_search), not something to ask for in prose. On Qwen3.8 Max it is available in the Beijing and Singapore regions.",
            "All three take text, image and video input with a 1M-token context, so long documents fit — but say which part of them matters.",
          ],
          [
            "El razonamiento viene activado en Qwen3.8 Max, Qwen3.7 Plus y Qwen3.8 Flash. Apagalo con enable_thinking para respuestas rápidas, o limitalo con thinking_budget.",
            "Modo JSON: con response_format json_object, la palabra 'JSON' tiene que aparecer en el prompt o el pedido falla. json_schema con strict obliga a respetar un esquema.",
            "La búsqueda web es un parámetro (enable_search), no algo que se pide en el texto. En Qwen3.8 Max está disponible en las regiones de Pekín y Singapur.",
            "Los tres aceptan texto, imagen y video con un contexto de 1M de tokens, así que entran documentos largos, pero decí qué parte importa.",
          ],
        ),
      },
    ],
    templates: [
      {
        title: enEs("Six-part brief", "Brief en seis partes"),
        purpose: "text",
        target: "qwen",
        prompt: enEs(
          `### Context
[background the model needs]
### Objective
[the one task to complete]
### Style
[e.g. a support agent's reply]
### Tone
[e.g. warm, concise]
### Audience
[who reads it and what they already know]
### Response
[exact format, e.g. 3 short paragraphs, max 120 words]`,
          `### Contexto
[lo que el modelo necesita saber]
### Objetivo
[la única tarea a completar]
### Estilo
[ej.: respuesta de un agente de soporte]
### Tono
[ej.: cálido, conciso]
### Audiencia
[quién lo lee y qué sabe ya]
### Respuesta
[formato exacto, ej. 3 párrafos cortos, máximo 120 palabras]`,
        ),
      },
      {
        title: enEs("Classification with examples", "Clasificación con ejemplos"),
        purpose: "data",
        target: "qwen",
        prompt: enEs(
          `Classify each support ticket as "billing", "bug" or "how-to". Return JSON: [{"id": number, "label": string}].

Examples:
"I was charged twice" -> billing
"The export button does nothing" -> bug
"How do I add a teammate?" -> how-to

### Tickets
[paste tickets with their ids]
###`,
          `Clasificá cada ticket de soporte como "billing", "bug" o "how-to". Devolvé JSON: [{"id": number, "label": string}].

Ejemplos:
"Me cobraron dos veces" -> billing
"El botón de exportar no hace nada" -> bug
"¿Cómo agrego a un compañero?" -> how-to

### Tickets
[pegá los tickets con su id]
###`,
        ),
      },
    ],
    faq: [
      {
        q: enEs("Why does my JSON-mode request fail?", "¿Por qué falla mi pedido en modo JSON?"),
        a: enEs(
          "With json_object, Model Studio requires the word 'JSON' in the prompt. Add it (for example 'Return JSON with these fields…') or switch to json_schema.",
          "Con json_object, Model Studio exige que la palabra 'JSON' esté en el prompt. Agregala (por ejemplo, 'Devolvé JSON con estos campos…') o pasá a json_schema.",
        ),
      },
      {
        q: enEs("Is there a Qwen coder model?", "¿Hay un modelo de Qwen para código?"),
        a: enEs(
          "Alibaba's docs now point coding work to the latest general-purpose model, so use Qwen3.8 Max or Qwen3.7 Plus with clear acceptance criteria.",
          "La documentación de Alibaba ahora recomienda el modelo general más reciente para código, así que usá Qwen3.8 Max o Qwen3.7 Plus con criterios de aceptación claros.",
        ),
      },
    ],
  },
  {
    slug: "glm-prompt-guide",
    updated: UPDATED,
    title: enEs(
      "GLM prompt guide: constraints early, useful roles and explicit JSON",
      "Guía de prompts para GLM: restricciones al principio, roles útiles y JSON explícito",
    ),
    description: enEs(
      "How to write prompts for GLM-5.3 and GLM-5.3 Flash from Z.ai (Zhipu AI), following Zhipu's general prompt-engineering guide and the GLM-5.3 docs.",
      "Cómo escribir prompts para GLM-5.3 y GLM-5.3 Flash de Z.ai (Zhipu AI), siguiendo la guía general de prompt engineering de Zhipu y la documentación de GLM-5.3.",
    ),
    sections: [
      {
        heading: enEs("What Zhipu recommends", "Qué recomienda Zhipu"),
        bullets: enEsList(
          [
            "Give the important constraints you already know as early as possible. A rule that arrives at the end is easy to under-weight.",
            "Roles should serve the task. Skip inflated identities like 'world-class expert'; a role cannot replace the task description, the source evidence or the validation criteria.",
            "Name tags after what they contain and keep them consistent, so the model can tell the requirements it must follow from the material it must process.",
            "The number of examples is not the goal: cover the differences that matter.",
            "For JSON, spell out the structure, what each field means and the allowed values. A structured prompt describes the result but cannot guarantee valid data, so validate it in your app.",
          ],
          [
            "Dá las restricciones importantes que ya conocés lo antes posible. Una regla que llega al final es fácil de subestimar.",
            "Los roles tienen que servir a la tarea. Evitá identidades infladas como 'experto de nivel mundial'; un rol no reemplaza la descripción de la tarea, la evidencia fuente ni los criterios de validación.",
            "Nombrá las etiquetas según lo que contienen y mantenelas iguales, para que el modelo distinga los requisitos que debe seguir del material que debe procesar.",
            "La cantidad de ejemplos no es el objetivo: cubrí las diferencias que importan.",
            "Para JSON, explicitá la estructura, qué significa cada campo y los valores permitidos. Un prompt estructurado describe el resultado pero no garantiza datos válidos, así que validalos en tu app.",
          ],
        ),
      },
      {
        heading: enEs("What is different about GLM-5.3", "Qué cambia con GLM-5.3"),
        bullets: enEsList(
          [
            "Reasoning is always on: disabling it is no longer supported. Pick reasoning_effort low, high or max (default max); low is the setting for quick tasks.",
            "GLM-5.3 takes text only, with a 1M-token context and up to 128K tokens of output. Use GLM-5.3 Flash for images, video and files.",
            "Because it already reasons, you do not need 'think step by step'. Spend the words on constraints and on how to check the answer.",
          ],
          [
            "El razonamiento está siempre activo: ya no se puede desactivar. Elegí reasoning_effort low, high o max (por defecto max); low es el ajuste para tareas rápidas.",
            "GLM-5.3 acepta solo texto, con un contexto de 1M de tokens y hasta 128K de salida. Para imágenes, video y archivos usá GLM-5.3 Flash.",
            "Como ya razona, no hace falta 'pensá paso a paso'. Usá esas palabras para las restricciones y para cómo verificar la respuesta.",
          ],
        ),
      },
    ],
    templates: [
      {
        title: enEs("Constraints-first review", "Revisión con restricciones primero"),
        purpose: "text",
        target: "glm",
        prompt: enEs(
          `Constraints (apply to everything below):
- Audience: [who]
- Max length: [limit]
- Do not: [what to avoid]

Task: review the draft below and return the 5 most important fixes, most important first.

<draft>
[paste the draft]
</draft>

Done when: each fix names the sentence it applies to and the reason.`,
          `Restricciones (valen para todo lo que sigue):
- Audiencia: [quién]
- Largo máximo: [límite]
- No: [qué evitar]

Tarea: revisá el borrador de abajo y devolvé las 5 correcciones más importantes, de mayor a menor.

<borrador>
[pegá el borrador]
</borrador>

Listo cuando: cada corrección nombra la oración a la que aplica y el motivo.`,
        ),
      },
      {
        title: enEs("JSON with allowed values", "JSON con valores permitidos"),
        purpose: "data",
        target: "glm",
        prompt: enEs(
          `Read the review below and return JSON only:
{"sentiment": "positive" | "neutral" | "negative", "topics": string[] (max 3, lowercase), "refund_requested": boolean}
- sentiment: the reviewer's overall view.
- topics: what the review is about (e.g. "delivery", "price").
- refund_requested: true only if the reviewer asks for money back.

<review>
[paste the review]
</review>`,
          `Leé la reseña de abajo y devolvé solo JSON:
{"sentiment": "positive" | "neutral" | "negative", "topics": string[] (máximo 3, en minúscula), "refund_requested": boolean}
- sentiment: la opinión general de quien escribe.
- topics: de qué habla la reseña (ej. "envío", "precio").
- refund_requested: true solo si pide que le devuelvan el dinero.

<reseña>
[pegá la reseña]
</reseña>`,
        ),
      },
    ],
    faq: [
      {
        q: enEs("Should I ask GLM-5.3 to think step by step?", "¿Le pido a GLM-5.3 que piense paso a paso?"),
        a: enEs(
          "No need: it always reasons. Adjust depth with reasoning_effort and use the prompt for constraints, material and success criteria.",
          "No hace falta: siempre razona. Ajustá la profundidad con reasoning_effort y usá el prompt para restricciones, material y criterios de éxito.",
        ),
      },
      {
        q: enEs("Z.ai or Zhipu AI?", "¿Z.ai o Zhipu AI?"),
        a: enEs(
          "Both are Zhipu AI platforms: Z.ai (docs.z.ai) for international users and BigModel (bigmodel.cn) in China. Promptea lists the model ids from the Z.ai docs.",
          "Las dos son plataformas de Zhipu AI: Z.ai (docs.z.ai) para usuarios internacionales y BigModel (bigmodel.cn) en China. Promptea lista los ids de modelo de la documentación de Z.ai.",
        ),
      },
    ],
  },
  {
    slug: "minimax-prompt-guide",
    updated: UPDATED,
    title: enEs(
      "MiniMax prompt guide: coding and agent prompts for MiniMax-M3",
      "Guía de prompts para MiniMax: prompts de código y agentes para MiniMax-M3",
    ),
    description: enEs(
      "How to write prompts for MiniMax-M3 and MiniMax-M3.1 Flash: acceptance criteria, fixed sampling, JSON without a JSON mode and tool loops, from MiniMax's API docs.",
      "Cómo escribir prompts para MiniMax-M3 y MiniMax-M3.1 Flash: criterios de aceptación, muestreo fijo, JSON sin modo JSON y loops de herramientas, según la documentación de la API de MiniMax.",
    ),
    sections: [
      {
        heading: enEs("What the docs tell you", "Qué dice la documentación"),
        bullets: enEsList(
          [
            "MiniMax lists both models as frontier coding models with a 1M-token context and text, image and video input.",
            "Temperature and top_p are ignored: the models always run at 1 and 0.95. Precision has to come from the prompt.",
            "MiniMax-M3 reasons by default and can turn it off (thinking: disabled). MiniMax-M3.1 Flash always reasons; tune it with reasoning_effort (default max).",
            "In tool calling, send the model's full response back on every turn, including reasoning_content, or the loop loses its reasoning.",
            "MiniMax publishes no general prompting guide, so the advice below is about what makes a coding prompt checkable.",
          ],
          [
            "MiniMax presenta los dos modelos como modelos de código de frontera, con contexto de 1M de tokens y entrada de texto, imagen y video.",
            "La temperatura y top_p se ignoran: los modelos siempre corren en 1 y 0.95. La precisión tiene que salir del prompt.",
            "MiniMax-M3 razona por defecto y se puede apagar (thinking: disabled). MiniMax-M3.1 Flash siempre razona; se ajusta con reasoning_effort (por defecto max).",
            "Con herramientas, devolvé la respuesta completa del modelo en cada turno, reasoning_content incluido, o el loop pierde su razonamiento.",
            "MiniMax no publica una guía general de prompts, así que los consejos de abajo apuntan a que un prompt de código se pueda verificar.",
          ],
        ),
      },
      {
        heading: enEs("Patterns that work", "Patrones que funcionan"),
        bullets: enEsList(
          [
            "State the goal in one sentence, then the acceptance criteria as observable behavior, then the command that verifies them.",
            "Name the files that matter and what must not change; agents widen the scope when nothing bounds it.",
            "For JSON there is no documented JSON mode: give the exact shape, one example and 'return the JSON only'.",
            "Ask for a closing report: what changed, what was verified and what was not.",
          ],
          [
            "Decí el objetivo en una oración, después los criterios de aceptación como comportamiento observable, y después el comando que los verifica.",
            "Nombrá los archivos que importan y qué no debe cambiar; los agentes amplían el alcance cuando nada lo limita.",
            "Para JSON no hay un modo documentado: dá la forma exacta, un ejemplo y 'devolvé solo el JSON'.",
            "Pedí un reporte final: qué cambió, qué se verificó y qué no.",
          ],
        ),
      },
    ],
    templates: [
      {
        title: enEs("Bug fix with a failing test first", "Arreglo de bug con un test que falla primero"),
        purpose: "code",
        target: "minimax",
        prompt: enEs(
          `Goal: fix [bug, one sentence].
Expected: [behavior]. Actual: [behavior + error message].
Relevant files: [paths]
Do not change: [public API, other modules]
Steps:
1) Write a test that reproduces the bug and fails.
2) Fix the code until it passes.
Verify with: [test command]
Report: the cause, the diff summary and anything left unverified.`,
          `Objetivo: arreglar [bug, una oración].
Esperado: [comportamiento]. Real: [comportamiento + mensaje de error].
Archivos relevantes: [rutas]
No cambiar: [API pública, otros módulos]
Pasos:
1) Escribí un test que reproduzca el bug y falle.
2) Corregí el código hasta que pase.
Verificá con: [comando de tests]
Reporte: la causa, el resumen del diff y lo que quedó sin verificar.`,
        ),
      },
    ],
    faq: [
      {
        q: enEs("Can I make MiniMax more deterministic with temperature 0?", "¿Puedo hacer a MiniMax más determinístico con temperatura 0?"),
        a: enEs(
          "No: MiniMax ignores temperature and top_p on these models. Make the output stable with an exact format, an example and explicit acceptance criteria.",
          "No: MiniMax ignora temperature y top_p en estos modelos. Estabilizá la salida con un formato exacto, un ejemplo y criterios de aceptación explícitos.",
        ),
      },
      {
        q: enEs("What happens to MiniMax-M2.7?", "¿Qué pasa con MiniMax-M2.7?"),
        a: enEs(
          "MiniMax-M2.5 and M2.7 take no new users since 2026-10-19 and retire on 2026-11-18. Move to MiniMax-M3.",
          "MiniMax-M2.5 y M2.7 no aceptan usuarios nuevos desde el 2026-10-19 y se retiran el 2026-11-18. Pasá a MiniMax-M3.",
        ),
      },
    ],
  },
  {
    slug: "doubao-prompt-guide",
    updated: UPDATED,
    title: enEs(
      "Doubao prompt guide: goal and scenario for Doubao Seed 2.1",
      "Guía de prompts para Doubao: objetivo y escenario para Doubao Seed 2.1",
    ),
    description: enEs(
      "How to write prompts for ByteDance's Doubao Seed 2.1 Pro, Lite and Turbo on Volcengine Ark, following Volcengine's guidance for reasoning models.",
      "Cómo escribir prompts para Doubao Seed 2.1 Pro, Lite y Turbo de ByteDance en Volcengine Ark, siguiendo las recomendaciones de Volcengine para modelos con razonamiento.",
    ),
    sections: [
      {
        heading: enEs("What Volcengine recommends for reasoning models", "Qué recomienda Volcengine para modelos con razonamiento"),
        bullets: enEsList(
          [
            "Besides the problem itself, add the goal and the scenario: who the answer is for, what it will be used for and what a good outcome looks like.",
            "Reduce or avoid breaking the problem into steps or giving worked examples: with thinking on, that constrains the model's own reasoning.",
            "Use fewer system prompts; send the prompt information as the user message.",
            "In multi-turn chats, keep the reasoning_content field of earlier turns; in agent tool loops, some models require the encrypted reasoning to be passed back unchanged.",
          ],
          [
            "Además del problema en sí, sumá el objetivo y el escenario: para quién es la respuesta, para qué se va a usar y cómo se ve un buen resultado.",
            "Reducí o evitá descomponer el problema en pasos o dar ejemplos resueltos: con el razonamiento activo, eso limita la lógica propia del modelo.",
            "Usá menos prompts de sistema; mandá la información del prompt como mensaje del usuario.",
            "En chats de varios turnos, conservá el campo reasoning_content de los turnos anteriores; en loops de agente con herramientas, algunos modelos exigen devolver el razonamiento cifrado sin cambios.",
          ],
        ),
      },
      {
        heading: enEs("Settings that change the result", "Ajustes que cambian el resultado"),
        bullets: enEsList(
          [
            "Thinking is on by default; turn it off with thinking type disabled for simple tasks. reasoning_effort defaults to high on Seed 2.1.",
            "Default max output is 4K tokens even though the models allow up to 256K: set max_tokens for long answers.",
            "Structured output is in beta: json_object needs the string 'json' in the input; json_schema with strict enforces the schema. Do not combine it with frequency or presence penalties.",
            "Pro and Lite have a 1024K context; Turbo, built for low latency, has 256K. Lite also accepts audio.",
          ],
          [
            "El razonamiento viene activado; apagalo con thinking type disabled para tareas simples. En Seed 2.1, reasoning_effort viene en high.",
            "La salida máxima por defecto es de 4K tokens aunque los modelos admiten hasta 256K: fijá max_tokens para respuestas largas.",
            "La salida estructurada está en beta: json_object necesita la cadena 'json' en la entrada; json_schema con strict obliga a respetar el esquema. No la combines con penalizaciones de frecuencia o presencia.",
            "Pro y Lite tienen contexto de 1024K; Turbo, pensado para baja latencia, de 256K. Lite además acepta audio.",
          ],
        ),
      },
    ],
    templates: [
      {
        title: enEs("Goal + scenario request", "Pedido con objetivo + escenario"),
        purpose: "marketing",
        target: "doubao",
        prompt: enEs(
          `Problem: write the launch email for [product/feature].
Goal: existing customers try [feature] this week.
Scenario: sent on [day] to [segment]; most read it on their phone.
Audience: [who they are and what they already use]
Constraints: under 150 words, no discounts, plain language.
Output format: subject line (max 8 words) + body + one call to action.`,
          `Problema: escribí el email de lanzamiento de [producto/función].
Objetivo: que los clientes actuales prueben [función] esta semana.
Escenario: se envía el [día] a [segmento]; la mayoría lo lee en el celular.
Audiencia: [quiénes son y qué usan ya]
Restricciones: menos de 150 palabras, sin descuentos, lenguaje simple.
Formato de salida: asunto (máximo 8 palabras) + cuerpo + un llamado a la acción.`,
        ),
      },
    ],
    faq: [
      {
        q: enEs("Should I give Doubao a step-by-step plan?", "¿Le doy a Doubao un plan paso a paso?"),
        a: enEs(
          "With thinking on, Volcengine advises against it: describe the goal, the scenario and the constraints, and let the model plan the steps.",
          "Con el razonamiento activo, Volcengine lo desaconseja: describí el objetivo, el escenario y las restricciones, y dejá que el modelo planifique los pasos.",
        ),
      },
      {
        q: enEs("Doubao or Dola Seed?", "¿Doubao o Dola Seed?"),
        a: enEs(
          "The same model family: Doubao on Volcengine Ark in China, Dola Seed on BytePlus ModelArk internationally.",
          "La misma familia de modelos: Doubao en Volcengine Ark en China y Dola Seed en BytePlus ModelArk a nivel internacional.",
        ),
      },
    ],
  },
];
