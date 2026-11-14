// lib/promptTemplates.ts
//
// Types now live in lib/domain.ts (single source of truth) and are
// re-exported here so existing imports keep working.
export type { Lang, TargetAI } from "@/lib/domain";
import { pick, type Lang, type TargetAI } from "@/lib/domain";

/** Task type as used by templates: canonical domain TaskType plus the
 * classifier's "general" bucket for unclassified prompts. */
import type { TaskType as DomainTaskType } from "@/lib/domain";
export type TaskType = DomainTaskType | "general";

export type OutputPreset = {
  title: string; // label en UI/opt prompt
  lines: string[];
};

export function modelLabel(target: TargetAI) {
  switch (target) {
    case "gpt":
      return "GPT";
    case "gemini":
      return "Gemini";
    case "grok":
      return "Grok";
    case "claude":
      return "Claude";
    case "kimi":
      return "Kimi";
    case "deepseek":
      return "Deepseek";
    case "perplexity":
      return "Perplexity";
    case "qwen":
      return "Qwen";
    case "glm":
      return "GLM";
    case "minimax":
      return "MiniMax";
    case "doubao":
      return "Doubao";
  }
}

export function languageLine(lang: Lang) {
  return pick(lang, {
    es: "Respondé exclusivamente en español (mismo idioma que esta interfaz).",
    en: "Answer exclusively in English (same language as this interface).",
    pt: "Responda exclusivamente em português do Brasil (o mesmo idioma desta interface).",
  });
}

export function askQuestionsLine(lang: Lang) {
  return pick(lang, {
    es: "Si te falta información para responder bien, haceme hasta 3 preguntas puntuales antes de responder (sin suponer).",
    en: "If you lack information to answer well, ask up to 3 precise questions before answering (no guessing).",
    pt: "Se faltar informação para responder bem, faça até 3 perguntas precisas antes de responder (sem adivinhar).",
  });
}

export function outputPreset(task: TaskType, lang: Lang): OutputPreset {
  const title = pick(lang, { es: "OUTPUT FORMAT", en: "OUTPUT FORMAT", pt: "FORMATO DE SAÍDA" });

  switch (task) {
    case "coding":
      return {
        title,
        lines: pick(lang, {
          es: ["- Explicación breve", "- Solución (código)", "- Casos borde", "- Tests mínimos", "- Cómo ejecutar"],
          en: ["- Brief explanation", "- Solution (code)", "- Edge cases", "- Minimal tests", "- How to run"],
          pt: ["- Explicação breve", "- Solução (código)", "- Casos de borda", "- Testes mínimos", "- Como executar"],
        }),
      };

    case "debugging":
      return {
        title,
        lines: pick(lang, {
          es: ["- Diagnóstico", "- Causa probable", "- Fix paso a paso", "- Validación / tests", "- Prevención"],
          en: ["- Diagnosis", "- Likely cause", "- Step-by-step fix", "- Validation / tests", "- Prevention"],
          pt: ["- Diagnóstico", "- Causa provável", "- Correção passo a passo", "- Validação / testes", "- Prevenção"],
        }),
      };

    case "refactor":
      return {
        title,
        lines: pick(lang, {
          es: ["- Objetivo del refactor", "- Cambios propuestos", "- Código final", "- Riesgos", "- Tests"],
          en: ["- Refactor goal", "- Proposed changes", "- Final code", "- Risks", "- Tests"],
          pt: ["- Objetivo da refatoração", "- Mudanças propostas", "- Código final", "- Riscos", "- Testes"],
        }),
      };

    case "research":
      return {
        title,
        lines: pick(lang, {
          es: ["- Resumen ejecutivo", "- Hallazgos clave", "- Supuestos", "- Fuentes", "- Próximos pasos"],
          en: ["- Executive summary", "- Key findings", "- Assumptions", "- Sources", "- Next steps"],
          pt: ["- Resumo executivo", "- Principais achados", "- Suposições", "- Fontes", "- Próximos passos"],
        }),
      };

    case "marketing":
      return {
        title,
        lines: pick(lang, {
          es: ["- 3 versiones (corta / media / larga)", "- Tono de marca", "- CTA", "- Variantes A/B"],
          en: ["- 3 versions (short / medium / long)", "- Brand voice", "- CTA", "- A/B variants"],
          pt: ["- 3 versões (curta / média / longa)", "- Voz da marca", "- CTA", "- Variantes A/B"],
        }),
      };

    case "summarization":
      return {
        title,
        lines: pick(lang, {
          es: ["- Resumen en 5 viñetas", "- 3 ideas clave", "- Dudas / faltantes", "- Próximos pasos"],
          en: ["- 5-bullet summary", "- 3 key ideas", "- Missing info / questions", "- Next steps"],
          pt: ["- Resumo em 5 tópicos", "- 3 ideias-chave", "- Informações que faltam / perguntas", "- Próximos passos"],
        }),
      };

    case "translation":
      return {
        title,
        lines: pick(lang, {
          es: ["- Traducción", "- Alternativa más formal", "- Alternativa más natural", "- Notas de contexto"],
          en: ["- Translation", "- More formal alternative", "- More natural alternative", "- Context notes"],
          pt: ["- Tradução", "- Alternativa mais formal", "- Alternativa mais natural", "- Notas de contexto"],
        }),
      };

    case "data_extraction":
      return {
        title,
        lines: pick(lang, {
          es: ["- JSON estricto", "- Campos requeridos", "- Faltantes como null", "- Validación de formato"],
          en: ["- Strict JSON", "- Required fields", "- Missing values as null", "- Format validation"],
          pt: ["- JSON estrito", "- Campos obrigatórios", "- Valores ausentes como null", "- Validação de formato"],
        }),
      };

    case "planning":
      return {
        title,
        lines: pick(lang, {
          es: ["- Objetivo", "- Plan por pasos", "- Checklist", "- Riesgos", "- Próximas acciones"],
          en: ["- Goal", "- Step-by-step plan", "- Checklist", "- Risks", "- Next actions"],
          pt: ["- Objetivo", "- Plano passo a passo", "- Checklist", "- Riscos", "- Próximas ações"],
        }),
      };

    default:
      return {
        title,
        lines: pick(lang, {
          es: ["- Respuesta en viñetas", "- Resumen final", "- Próximos pasos"],
          en: ["- Bullet answer", "- Final summary", "- Next steps"],
          pt: ["- Resposta em tópicos", "- Resumo final", "- Próximos passos"],
        }),
      };
  }
}

export function targetTip(target: TargetAI, lang: Lang) {
  switch (target) {
    case "claude":
      return pick(lang, {
        es: "Claude suele responder mejor con secciones muy claras (incluso con tags tipo XML).",
        en: "Claude often does best with very clear sections (even XML-like tags).",
        pt: "O Claude costuma render mais com seções bem claras (até com tags no estilo XML).",
      });
    case "gemini":
      return pick(lang, {
        es: "Gemini mejora mucho si le das ejemplos y le pedís que marque supuestos.",
        en: "Gemini improves a lot with examples and explicit assumptions.",
        pt: "O Gemini melhora muito com exemplos e suposições explícitas.",
      });
    case "deepseek":
      return pick(lang, {
        es: "Deepseek suele rendir muy bien en código si pedís tests y casos borde.",
        en: "Deepseek excels for code if you request tests and edge cases.",
        pt: "O Deepseek se destaca em código quando você pede testes e casos de borda.",
      });
    case "kimi":
      return pick(lang, {
        es: "Kimi maneja bien contexto largo: separalo en bloques y marcá prioridades.",
        en: "Kimi handles long context well: split into blocks and mark priorities.",
        pt: "O Kimi lida bem com contexto longo: divida em blocos e marque as prioridades.",
      });
    case "grok":
      return pick(lang, {
        es: "Grok funciona mejor si definís el tono y cuán directo querés que sea.",
        en: "Grok works best if you define tone and how direct you want it.",
        pt: "O Grok funciona melhor quando você define o tom e o quanto quer que ele seja direto.",
      });
    case "qwen":
      return pick(lang, {
        es: "Qwen rinde mejor con secciones claras (contexto, objetivo, estilo, tono, audiencia, respuesta), delimitadores como ### y un ejemplo.",
        en: "Qwen does best with clear sections (context, objective, style, tone, audience, response), delimiters like ### and an example.",
        pt: "O Qwen rende mais com seções claras (contexto, objetivo, estilo, tom, público, resposta), delimitadores como ### e um exemplo.",
      });
    case "glm":
      return pick(lang, {
        es: "GLM siempre razona: poné las restricciones importantes al principio y no infles el rol: que sirva a la tarea.",
        en: "GLM always reasons: put the important constraints early and don't inflate the role: make it serve the task.",
        pt: "O GLM sempre raciocina: coloque as restrições importantes no começo e não infle o papel: que ele sirva à tarefa.",
      });
    case "minimax":
      return pick(lang, {
        es: "MiniMax M3 apunta a código y agentes: dale contexto del repo, criterios de aceptación y cómo verificar el resultado.",
        en: "MiniMax M3 is built for coding and agents: give repo context, acceptance criteria and how to verify the result.",
        pt: "O MiniMax M3 é feito para código e agentes: dê o contexto do repositório, critérios de aceitação e como verificar o resultado.",
      });
    case "doubao":
      return pick(lang, {
        es: "Doubao rinde mejor con el objetivo y el escenario claros, sin descomponer el problema en pasos.",
        en: "Doubao does best with a clear goal and scenario, without breaking the problem into steps.",
        pt: "O Doubao rende mais com objetivo e cenário claros, sem decompor o problema em passos.",
      });
    case "perplexity":
      return pick(lang, {
        es: "Perplexity tiene acceso web en tiempo real. Pedí fuentes o aclará si necesitás info reciente.",
        en: "Perplexity has real-time web access. Ask for sources or specify recency if freshness matters.",
        pt: "O Perplexity tem acesso à web em tempo real. Peça fontes ou especifique o período se a atualidade importar.",
      });
    default:
      return pick(lang, {
        es: "GPT mejora si separás objetivo, contexto y formato en secciones cortas.",
        en: "GPT improves if you separate goal, context, and output format into short sections.",
        pt: "O GPT melhora quando você separa objetivo, contexto e formato de saída em seções curtas.",
      });
  }
}

