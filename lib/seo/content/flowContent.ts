// lib/seo/content/flowContent.ts
//
// The FAQ of /{lang}/flow. One source for the visible FAQ, its FAQPage
// structured data and (v1.9.0) the page's markdown twin, so they cannot drift.

import { pick, type Lang } from "@/lib/domain";

export function flowFaq(lang: Lang): Array<{ q: string; a: string }> {
  return [
    {
      q: pick(lang, {
        es: "¿Qué es un flujo de prompts?",
        en: "What is a prompt flow?",
        pt: "O que é um fluxo de prompts?",
        zh: "什么是提示词流程？",
      }),
      a: pick(lang, {
        es: "Es una tarea grande dividida en una cadena de prompts más chicos: cada paso hace una sola cosa y le pasa su resultado al siguiente. Los pasos que no dependen entre sí se pueden hacer en paralelo.",
        en: "It is a big task split into a chain of smaller prompts: each step does one thing and hands its result to the next. Steps that don't depend on each other can run in parallel.",
        pt: "É uma tarefa grande dividida em uma cadeia de prompts menores: cada etapa faz uma só coisa e passa o resultado para a próxima. As etapas que não dependem umas das outras podem ser feitas em paralelo.",
        zh: "就是把一项大任务拆成一串较小的提示词：每一步只做一件事，并把结果交给下一步。彼此独立的步骤可以并行进行。",
      }),
    },
    {
      q: pick(lang, {
        es: "¿Por qué conviene dividir una tarea en varios prompts?",
        en: "Why split a task into several prompts?",
        pt: "Por que vale a pena dividir uma tarefa em vários prompts?",
        zh: "为什么要把任务拆成多个提示词？",
      }),
      a: pick(lang, {
        es: "Porque un prompt con un solo objetivo es más fácil de escribir, revisar y corregir. Encadenar pasos reduce los errores en tareas largas y te deja usar una IA distinta para cada parte.",
        en: "Because a prompt with a single goal is easier to write, check and fix. Chaining steps cuts errors on long tasks and lets you use a different AI for each part.",
        pt: "Porque um prompt com um único objetivo é mais fácil de escrever, revisar e corrigir. Encadear etapas reduz os erros em tarefas longas e permite usar uma IA diferente para cada parte.",
        zh: "因为目标单一的提示词更容易编写、检查和修改。把步骤串联起来可以减少长任务中的错误，还能为每个部分选用不同的AI。",
      }),
    },
    {
      q: pick(lang, {
        es: "¿Qué IA usa Promptea para armar el flujo?",
        en: "Which AI does Promptea use to build the flow?",
        pt: "Qual IA o Promptea usa para montar o fluxo?",
        zh: "Promptea用哪个AI来生成流程？",
      }),
      a: pick(lang, {
        es: "Claude, de Anthropic, con un tope de uso mensual. Si la IA no está disponible, el motor propio de Promptea arma un plan básico. La IA sugerida para cada paso la elige el motor de «Elegir la mejor IA».",
        en: "Claude, by Anthropic, within a monthly usage cap. When AI isn't available, Promptea's own engine builds a basic plan. The AI suggested for each step is picked by the \"Find the best AI\" engine.",
        pt: "O Claude, da Anthropic, com um limite de uso mensal. Se a IA não estiver disponível, o motor do próprio Promptea monta um plano básico. A IA sugerida para cada etapa é escolhida pelo motor de \"Encontrar a melhor IA\".",
        zh: "使用Anthropic的Claude，并设有每月使用上限。AI不可用时，由Promptea自己的引擎生成基础方案。每一步推荐的AI由“找到最合适的AI”的引擎挑选。",
      }),
    },
  ];
}
