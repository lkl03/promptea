// Matcher golden fixtures (bilingual). Each case pins the DETERMINISTIC
// behavior a real prompt must produce: detected signals, top category,
// interaction profile, and — where structurally certain — the recommended
// target/product class and confidence behavior. Ranking correctness against
// synthetic candidates lives in matcher.scoring.test.ts.

import { describe, expect, test } from "vitest";
import { matchPrompt } from "@/lib/matcher";
import type { InteractionProfile, MatchCategory } from "@/lib/domain";

type Fixture = {
  id: string;
  lang: "es" | "en";
  prompt: string;
  /** Signal ids that MUST be detected. */
  signals?: string[];
  /** Signal ids that must NOT be detected. */
  notSignals?: string[];
  topCategory?: MatchCategory;
  profile?: InteractionProfile;
  /** Product label must be one of these (agent envs are products, not models). */
  productOneOf?: string[];
  target?: string;
  confidence?: "high" | "medium" | "low";
  minAlternatives?: number;
};

const FIXTURES: Fixture[] = [
  // ── Coding agent / repo prompts ───────────────────────────────────────────
  {
    id: "en-repo-migration",
    lang: "en",
    prompt:
      "In the repo acme/api, migrate src/middleware/auth.ts from Express to Fastify. Keep the JWT flow, run npm test and npm run lint, then open a pull request against main with acceptance criteria in the description.",
    signals: ["repo_paths", "shell_commands", "git_workflow", "tests_acceptance"],
    topCategory: "codingAgent",
    profile: "codingAgent",
    productOneOf: ["Claude Code", "Codex", "Gemini CLI"],
  },
  {
    id: "es-repo-task",
    lang: "es",
    prompt:
      "En el repositorio lkl03/tienda, implementá el checkout en src/pages/checkout.tsx, corré npm test y abrí un pull request a main cuando pasen los tests.",
    signals: ["repo_paths", "shell_commands", "git_workflow"],
    topCategory: "codingAgent",
    profile: "codingAgent",
    productOneOf: ["Claude Code", "Codex", "Gemini CLI"],
  },
  {
    id: "en-autonomous-agent",
    lang: "en",
    prompt:
      "Use Claude Code to refactor the billing module end to end: inspect the repository, implement the change across branches, run the test suite, and commit the result.",
    signals: ["autonomous_multistep", "git_workflow"],
    profile: "codingAgent",
    productOneOf: ["Claude Code", "Codex", "Gemini CLI"],
  },
  {
    id: "es-migracion-repo",
    lang: "es",
    prompt:
      "Migrá la rama feature/pagos: actualizá lib/pagos.ts a la nueva API, ejecutá npm run lint y npm test, hacé commit y merge a main documentando la validación.",
    signals: ["repo_paths", "shell_commands", "git_workflow"],
    profile: "codingAgent",
  },
  // ── General coding questions (NOT agent) ──────────────────────────────────
  {
    id: "en-coding-question",
    lang: "en",
    prompt:
      "Why does this TypeScript function return undefined? function getUser(id) { const user = users.find(u => u.id === id) }",
    signals: ["code_content", "coding_language"],
    notSignals: ["repo_paths", "shell_commands"],
    topCategory: "coding",
  },
  {
    id: "es-error-codigo",
    lang: "es",
    prompt:
      "Tengo este error en Python: TypeError: 'NoneType' object is not iterable. La función procesa una lista que a veces llega vacía. ¿Cómo lo arreglo?",
    signals: ["coding_language", "debug_evidence"],
    topCategory: "coding",
  },
  {
    id: "en-react-snippet",
    lang: "en",
    prompt: "Write a React hook that debounces a value with a configurable delay. Include the TypeScript types.",
    signals: ["coding_language"],
    topCategory: "coding",
  },
  // ── Research / citations / recency ────────────────────────────────────────
  {
    id: "en-research-recent",
    lang: "en",
    prompt:
      "Research the latest AI regulation news from 2026 in the EU and give me the current status with sources and links to official documents.",
    signals: ["web_recency", "citations_required", "search_task"],
    topCategory: "research",
    profile: "researchAssistant",
    target: "perplexity",
  },
  {
    id: "es-investigacion-fuentes",
    lang: "es",
    prompt:
      "Investigá los precios actuales de las notebooks gamer en Argentina este mes y pasame las fuentes con URL de cada tienda.",
    signals: ["web_recency", "citations_required"],
    topCategory: "research",
    profile: "researchAssistant",
    target: "perplexity",
  },
  {
    id: "en-citation-paper",
    lang: "en",
    prompt:
      "Find recent academic papers about sleep and memory consolidation and cite the references properly with links.",
    signals: ["citations_required"],
    profile: "researchAssistant",
  },
  {
    id: "es-comparar-precios",
    lang: "es",
    prompt: "Buscá y compará precios de mercado actuales del iPhone en Chile y Argentina, con fuentes.",
    signals: ["search_task", "citations_required"],
    topCategory: "research",
  },
  // ── Strict JSON / data extraction ─────────────────────────────────────────
  {
    id: "en-json-extraction",
    lang: "en",
    prompt:
      "Extract name, email, and total from these receipts and return ONLY valid JSON with the schema {name: string, email: string, total: number}. Missing values must be null.",
    signals: ["strict_json"],
    topCategory: "dataExtraction",
  },
  {
    id: "es-extraccion-tabla",
    lang: "es",
    prompt:
      "Extraé de esta tabla las columnas fecha, cliente y monto, y devolvé solo JSON válido con esos campos. Si falta un valor, usá null.",
    signals: ["strict_json", "tabular_extraction"],
    topCategory: "dataExtraction",
  },
  {
    id: "en-csv-parse",
    lang: "en",
    prompt: "Parse this CSV of orders and extract the rows where total > 100 as a JSON array with fields: id, customer, total.",
    signals: ["strict_json", "tabular_extraction"],
    topCategory: "dataExtraction",
  },
  // ── Long documents ────────────────────────────────────────────────────────
  {
    id: "en-long-document",
    lang: "en",
    prompt:
      "I need to analyze a 200-page PDF contract chapter by chapter and compare the obligations in this document against our standard terms report.",
    signals: ["document_processing"],
  },
  {
    id: "es-informe-largo",
    lang: "es",
    prompt: "Tengo un informe extenso en PDF de 150 páginas y necesito analizarlo capítulo por capítulo con el detalle del contrato.",
    signals: ["document_processing"],
  },
  // ── Multimodal ────────────────────────────────────────────────────────────
  {
    id: "en-multimodal-screenshot",
    lang: "en",
    prompt: "Look at this screenshot of my dashboard and tell me why the chart looks broken. I attached the image.",
    signals: ["multimodal_refs"],
    topCategory: "multimodal",
    profile: "multimodalAssistant",
    target: "gemini",
  },
  {
    id: "es-analizar-imagen",
    lang: "es",
    prompt: "Analizá esta imagen del ticket de compra y decime qué productos aparecen. Adjunté una foto del recibo.",
    signals: ["multimodal_refs"],
    profile: "multimodalAssistant",
  },
  // ── Creative writing ──────────────────────────────────────────────────────
  {
    id: "en-creative-story",
    lang: "en",
    prompt:
      "Write a short story about a lighthouse keeper who discovers the sea is slowly turning to glass. Melancholic tone, two characters, open ending.",
    signals: ["creative_writing"],
    topCategory: "creativeWriting",
  },
  {
    id: "es-cuento",
    lang: "es",
    prompt: "Escribí un cuento corto sobre una abuela que le enseña a su nieta a cocinar recetas que ya nadie recuerda. Tono cálido, con diálogo.",
    signals: ["creative_writing"],
    topCategory: "creativeWriting",
  },
  // ── Marketing ─────────────────────────────────────────────────────────────
  {
    id: "en-marketing-ads",
    lang: "en",
    prompt:
      "Write 3 Instagram ad copy variants for our fitness app launch. Target audience: busy professionals. Each needs a hook, benefit, and CTA.",
    signals: ["marketing_copy"],
    topCategory: "marketing",
  },
  {
    id: "es-copy-campana",
    lang: "es",
    prompt:
      "Necesito copy para la campaña de lanzamiento de nuestra app de finanzas: 3 variantes para Instagram con hook, beneficio y CTA, tono cercano.",
    signals: ["marketing_copy"],
    topCategory: "marketing",
  },
  // ── Translation ───────────────────────────────────────────────────────────
  {
    id: "en-translation",
    lang: "en",
    prompt: "Translate this product description to Spanish, keeping the placeholders like {{price}} and the brand name intact.",
    signals: ["translation_task"],
    topCategory: "translation",
  },
  {
    id: "es-traduccion",
    lang: "es",
    prompt: "Traducí este mail al inglés manteniendo el tono formal y los nombres propios exactos.",
    signals: ["translation_task"],
    topCategory: "translation",
  },
  // ── Summarization ─────────────────────────────────────────────────────────
  {
    id: "en-summarize",
    lang: "en",
    prompt: "Summarize this meeting transcript into key points and decisions, TL;DR first, for an executive audience.",
    signals: ["summarization_task"],
    topCategory: "summarization",
  },
  {
    id: "es-resumen",
    lang: "es",
    prompt: "Haceme un resumen con los puntos clave de esta transcripción de reunión, empezando con una síntesis de 3 líneas.",
    signals: ["summarization_task"],
    topCategory: "summarization",
  },
  // ── Tutoring / study ──────────────────────────────────────────────────────
  {
    id: "en-tutoring",
    lang: "en",
    prompt: "Explain the Krebs cycle to me like I'm 15, step by step, and quiz me at the end so I can check I understood it for my exam.",
    signals: ["tutoring_task"],
    topCategory: "tutoring",
  },
  {
    id: "es-estudio",
    lang: "es",
    prompt: "Explicame la fotosíntesis paso a paso como si tuviera 12 años, con ejemplos, que la necesito aprender para el examen.",
    signals: ["tutoring_task"],
    topCategory: "tutoring",
  },
  // ── Image generation ──────────────────────────────────────────────────────
  {
    id: "en-image-gen",
    lang: "en",
    prompt: "Generate an image of an orange cat on a rooftop at sunset, cinematic style, photorealistic, aspect ratio 16:9.",
    signals: ["image_generation"],
    topCategory: "imagePrompts",
  },
  {
    id: "es-imagen",
    lang: "es",
    prompt: "Generá una imagen de un gato naranja en un techo al atardecer, estilo cinematográfico, relación de aspecto 16:9.",
    signals: ["image_generation"],
    topCategory: "imagePrompts",
  },
  // ── Complex reasoning ─────────────────────────────────────────────────────
  {
    id: "en-reasoning",
    lang: "en",
    prompt:
      "Prove that the sum of two odd integers is always even, then design the optimization trade-offs for a system that schedules 10,000 jobs with dependencies.",
    signals: ["complex_reasoning"],
    topCategory: "complexReasoning",
  },
  {
    id: "es-razonamiento",
    lang: "es",
    prompt:
      "Demostrá por qué esta estrategia de largo plazo domina a la alternativa, analizando los trade-offs de arquitectura de sistema y el razonamiento detrás de cada decisión.",
    signals: ["complex_reasoning"],
  },
  // ── Fast lightweight ──────────────────────────────────────────────────────
  {
    id: "en-quick-task",
    lang: "en",
    prompt: "Quick: fix this typo and rename the variable, one-liner answer.",
    signals: ["quick_lightweight"],
  },
  {
    id: "es-tarea-rapida",
    lang: "es",
    prompt: "Rápido: corregime esta frase, solo decime la versión corregida.",
    signals: ["quick_lightweight"],
  },
  // ── Simple / ambiguous messages → low confidence, no fabricated certainty ─
  {
    id: "en-simple-message",
    lang: "en",
    prompt: "help me write something nice",
    confidence: "low",
  },
  {
    id: "es-mensaje-simple",
    lang: "es",
    prompt: "ayudame con un mensaje para mi jefe",
    confidence: "low",
  },
  {
    id: "en-ambiguous",
    lang: "en",
    prompt: "I need this to be better, can you make it work?",
    confidence: "low",
  },
  {
    id: "es-ambiguo",
    lang: "es",
    prompt: "necesito que esto quede mejor, ¿podés?",
    confidence: "low",
  },
  // ── Mixed-language prompts ────────────────────────────────────────────────
  {
    id: "mixed-es-en-repo",
    lang: "es",
    prompt:
      "Please migrate el archivo src/utils/date.ts del repo to the new API, corré npm test and open a PR against main.",
    signals: ["repo_paths", "shell_commands", "git_workflow"],
    profile: "codingAgent",
  },
  {
    id: "mixed-en-es-marketing",
    lang: "en",
    prompt: "Write the campaign copy para el lanzamiento: 3 variantes with hook, beneficio and CTA for Instagram.",
    signals: ["marketing_copy"],
    topCategory: "marketing",
  },
  // ── Alternatives + structure sanity on rich prompts ───────────────────────
  {
    id: "en-rich-coding",
    lang: "en",
    prompt:
      "Implement a rate limiter middleware in TypeScript for our Express API in src/middleware/rateLimit.ts with tests in tests/rateLimit.test.ts, run npm test, and describe the acceptance criteria before opening the PR.",
    profile: "codingAgent",
    minAlternatives: 2,
  },
  {
    id: "es-rich-research",
    lang: "es",
    prompt:
      "Investigá el estado actual del mercado de alquileres en Buenos Aires este año, con fuentes oficiales y links, separando hechos verificados de inferencias.",
    profile: "researchAssistant",
    minAlternatives: 2,
  },
];

describe("matcher golden fixtures (deterministic, bilingual)", () => {
  test("dataset has at least 40 fixtures", () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(40);
  });

  for (const f of FIXTURES) {
    test(f.id, () => {
      const result = matchPrompt({ prompt: f.prompt, uiLang: f.lang });

      // Determinism: same input → byte-equal result.
      const again = matchPrompt({ prompt: f.prompt, uiLang: f.lang });
      expect(JSON.stringify(again)).toBe(JSON.stringify(result));

      const signalIds = result.detected.signals.map((s) => s.id);
      for (const id of f.signals ?? []) {
        expect(signalIds, `${f.id}: expected signal ${id}`).toContain(id);
      }
      for (const id of f.notSignals ?? []) {
        expect(signalIds, `${f.id}: unexpected signal ${id}`).not.toContain(id);
      }

      if (f.topCategory) {
        expect(result.detected.categories[0]?.category).toBe(f.topCategory);
      }
      if (f.profile) {
        expect(result.detected.profile).toBe(f.profile);
        expect(result.primary.profile).toBe(f.profile);
      }
      if (f.productOneOf) {
        expect(f.productOneOf).toContain(result.primary.productLabel);
      }
      if (f.target) {
        expect(result.primary.target).toBe(f.target);
      }
      if (f.confidence) {
        expect(result.confidence).toBe(f.confidence);
      }
      if (f.minAlternatives !== undefined) {
        expect(result.alternatives.length).toBeGreaterThanOrEqual(f.minAlternatives);
      }

      // Universal invariants.
      expect(result.primary.score).toBeGreaterThanOrEqual(0);
      expect(result.primary.score).toBeLessThanOrEqual(100);
      expect(result.primary.reasons.length).toBeGreaterThanOrEqual(2);
      expect(result.alternatives.length).toBeLessThanOrEqual(3);
      expect(result.advice.adaptation.length + result.advice.switching.length).toBeGreaterThan(0);
      if (result.isTie) {
        expect(typeof result.tieBreaker).toBe("string");
        expect(result.confidence).not.toBe("high");
      }
      // Alternatives carry trade-offs + strengths.
      for (const alt of result.alternatives) {
        expect(alt.tradeoff && alt.tradeoff.length).toBeTruthy();
        expect(alt.bestAt && alt.bestAt.length).toBeTruthy();
      }
      // Strings come back in the requested language for signal labels.
      expect(result.lang).toBe(f.lang);
    });
  }
});
