// v1.6.0 — image prompts are WRITTEN, not described.
//
// Before v1.6.0 an image request came back with a checklist telling the user
// what to add ("Subject, style, composition, lighting…"). These tests pin the
// new contract: the result is a finished, paste-ready image prompt that keeps
// every explicit user detail, resolves the missing art direction coherently,
// adapts its vocabulary to the medium, never invents identity, text, or
// brands, contains no placeholders, meta-instructions, keyword spam, or
// contradictions, preserves the user's language, and stays idempotent.

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { analyzePrompt } from "@/lib/analyzePrompt";
import {
  buildImagePrompt,
  composeImagePrompt,
  imagePromptIssues,
  isDevelopedImagePrompt,
} from "@/lib/engine/imagePrompt";
import { detectPromptLanguage } from "@/lib/refine/language";
import { isImageGenerationRequest, selectStrategy } from "@/lib/refine/router";
import { refinePromptAdaptive } from "@/lib/refine/adaptive";
import { runQualityGate } from "@/lib/refine/qualityGate";
import { isValidJson } from "@/lib/engine/jsonOutput";

type Case = {
  id: string;
  prompt: string;
  lang: "es" | "en";
  purpose: "image" | "text";
  /** Words from the user's request that must survive verbatim. */
  keeps: string[];
  /** Art-direction vocabulary the medium calls for (at least these). */
  mustMention: RegExp[];
  /** Vocabulary that would be wrong for this medium. */
  mustNotMention?: RegExp[];
};

const SPARSE: Case[] = [
  {
    id: "es-woman-landscape",
    prompt: "quiero crear la imagen de una mujer rubia mirando un paisaje",
    lang: "es",
    purpose: "text",
    keeps: ["mujer rubia", "paisaje"],
    mustMention: [/luz/i, /(plano|encuadre|tercio)/i, /(primer plano|plano medio|horizonte|colinas|montañas)/i, /relación de aspecto \d+:\d+/i, /\b\d{2} mm\b/i],
  },
  {
    id: "en-car-tokyo-night",
    prompt: "create an image of a red sports car driving through Tokyo at night",
    lang: "en",
    purpose: "text",
    keeps: ["red sports car", "Tokyo", "at night"],
    mustMention: [/\b\d{2}mm\b/i, /(neon|streetlight)/i, /(angle|frame)/i, /aspect ratio \d+:\d+/i, /(street|city)/i],
    mustNotMention: [/golden[- ]hour/i, /\bsunset\b/i, /midday/i],
  },
  {
    id: "en-dragon-children-illustration",
    prompt: "a small dragon reading a book in a library, children's illustration",
    lang: "en",
    purpose: "image",
    keeps: ["small dragon reading a book in a library"],
    mustMention: [/illustration/i, /(gouache|watercolor|brush|paper grain)/i, /(shelves|books)/i, /palette/i, /aspect ratio \d+:\d+/i],
    mustNotMention: [/\b\d{2,3}\s?mm\b/i, /f\/\d/i, /photorealistic/i, /\bbokeh\b/i],
  },
  {
    id: "en-product-watch",
    prompt: "minimal studio photo of a black wristwatch",
    lang: "en",
    purpose: "image",
    keeps: ["black wristwatch"],
    mustMention: [/macro|\d{2,3}mm/i, /softbox|strip light/i, /(backdrop|seamless)/i, /negative space/i, /aspect ratio 1:1/i],
    mustNotMention: [/golden[- ]hour/i, /\bsunset\b/i],
  },
];

const IDENTITY_INVENTION =
  /\b(caucasian|asian|african|european|latina|latino|nordic|scandinavian|japanese|chinese|korean|indian|arab|hispanic|white woman|black woman|christian|muslim|jewish|hindu|named|called)\b|\b(caucásica|asiática|africana|europea|latina|nórdica|japonesa|musulmana|cristiana|judía|llamada)\b/i;
const BRANDS = /\b(rolex|omega|casio|seiko|ferrari|lamborghini|porsche|nike|adidas|apple|canon|nikon|sony)\b/i;
const HEADINGS = /^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ &/]+:$/m;
const META_ADVICE = /\b(add|specify|choose|describe|define|include) (the )?(subject|style|composition|lighting|framing|mood|aspect ratio)\b|\b(agreg[aá]|especific[aá]|eleg[ií]|defin[ií]) (el |la )?(sujeto|estilo|composición|iluminación|encuadre|relación de aspecto)\b/i;

describe("sparse image requests become finished image prompts", () => {
  for (const c of SPARSE) {
    test(c.id, () => {
      const r = analyzePrompt(c.prompt, "gpt", c.lang, c.purpose);
      const out = r.optimizedPrompt;

      expect(r.meta.routing?.strategy, `${c.id}: routed as image`).toBe("image_generation");

      // An ACTUAL prompt: prose, not a headed checklist or advice.
      expect(out, `${c.id}: headings`).not.toMatch(HEADINGS);
      expect(out, `${c.id}: meta advice`).not.toMatch(META_ADVICE);
      expect(out).not.toMatch(/DESCRIPTION:|VISUAL ATTRIBUTES:|ATRIBUTOS VISUALES:/);
      expect(out.length, `${c.id}: fully developed`).toBeGreaterThan(c.prompt.length * 4);

      // Explicit details preserved verbatim.
      for (const k of c.keeps) expect(out.toLowerCase(), `${c.id}: keeps ${k}`).toContain(k.toLowerCase());

      // Meaningful art direction resolved for this medium.
      for (const re of c.mustMention) expect(out, `${c.id}: mentions ${re}`).toMatch(re);
      for (const re of c.mustNotMention ?? []) expect(out, `${c.id}: must not mention ${re}`).not.toMatch(re);

      // No placeholders, meta-instructions, keyword spam, or contradictions.
      expect(imagePromptIssues(out, c.prompt), `${c.id}: quality issues`).toEqual([]);

      // Fill art direction, never identity; no brands or text nobody asked for.
      expect(out, `${c.id}: identity invented`).not.toMatch(IDENTITY_INVENTION);
      expect(out, `${c.id}: brand invented`).not.toMatch(BRANDS);

      // Language follows the user's prompt.
      expect(detectPromptLanguage(out, c.lang).lang, `${c.id}: language`).toBe(c.lang);

      // Idempotent: the finished prompt re-analyzes to itself and skips the LLM.
      const r2 = analyzePrompt(out, "gpt", c.lang, c.purpose);
      expect(r2.optimizedPrompt, `${c.id}: idempotent`).toBe(out);
      expect(r2.meta.alreadyOptimized, `${c.id}: already optimized on re-analysis`).toBe(true);
    });
  }

  test("the Spanish example reads as one coherent direction (golden hour, gaze, landscape layers)", () => {
    const out = buildImagePrompt("quiero crear la imagen de una mujer rubia mirando un paisaje", "es");
    expect(out).toMatch(/^Fotografía realista de una mujer rubia mirando un paisaje\./);
    expect(out).toMatch(/de espaldas/); // looking AT the landscape → we share her view
    expect(out).toMatch(/pelo rubio/); // the explicit detail is used, not just repeated
    expect(out).toMatch(/hora dorada/);
    expect(out).toMatch(/Evitar: .*otras personas/);
  });
});

describe("explicit user choices always win over presets", () => {
  test("stated light, palette, aspect ratio, style, and exclusions are kept", () => {
    const out = buildImagePrompt("A cozy reading nook at golden hour, watercolor style, 3:2 aspect ratio, soft warm light, no people.", "en");
    expect(out).toMatch(/^Watercolor illustration of a cozy reading nook at golden hour\./);
    expect(out).toContain("Soft warm light");
    expect(out).toContain("Aspect ratio 3:2");
    expect(out).toMatch(/Avoid: [^\n]*people/);
    expect(out).not.toMatch(/\b\d{2}mm\b/); // illustration → no lens jargon
  });

  test("Spanish: stated palette and ratio survive, storm light replaces the default", () => {
    const out = buildImagePrompt("una ilustración de un faro en una tormenta, estilo acuarela, tonos fríos, relación de aspecto 4:5", "es");
    expect(out).toContain("Tonos fríos");
    expect(out).toContain("Relación de aspecto 4:5");
    expect(out).toMatch(/tormenta/i);
    expect(out).not.toMatch(/hora dorada/i);
  });

  test("black-and-white requests never get a color palette", () => {
    const out = buildImagePrompt("retrato de un hombre mayor en blanco y negro", "es");
    expect(out).toMatch(/Blanco y negro: gama tonal/);
    expect(out).not.toMatch(/ámbar|miel|color fiel|hora dorada/i);
  });

  test("requested text is rendered exactly and not excluded", () => {
    const out = buildImagePrompt('a poster for a jazz festival with the text "Blue Night"', "en");
    expect(out).toContain("“Blue Night” exactly as written");
    expect(out).not.toMatch(/Avoid: [^\n]*\btext\b/);
  });

  test("a logo without a name never gets invented lettering", () => {
    const out = buildImagePrompt("a logo for my bakery", "en");
    expect(out).toMatch(/^Logo design for my bakery\./);
    expect(out).toMatch(/Avoid: invented lettering or brand names/);
    expect(out).not.toMatch(/\bmm\b|f\/\d|golden[- ]hour/i);
  });

  test("generator syntax appears only when the user names the generator", () => {
    const mj = buildImagePrompt("a samurai in the rain, midjourney, 2:3", "en");
    expect(mj).toMatch(/--ar 2:3 --no text, watermark, logo$/);
    expect(mj).not.toMatch(/golden[- ]hour/i); // rain without a time → rain light
    const plain = buildImagePrompt("a samurai in the rain", "en");
    expect(plain).not.toContain("--ar");
    expect(plain).not.toMatch(/Simple, understated clothing/); // a samurai's wardrobe is implied
  });
});

describe("routing: generation vs. analysis", () => {
  test("generation intent routes to the image strategy under the default purpose", () => {
    for (const p of [
      "create an image of a red sports car driving through Tokyo at night",
      "quiero crear la imagen de una mujer rubia mirando un paisaje",
      "generá una ilustración de un zorro en el bosque",
      "photorealistic portrait of an old fisherman",
    ]) {
      expect(isImageGenerationRequest(p), p).toBe(true);
      expect(selectStrategy({ prompt: p, taskType: "text", purpose: "text" }).strategy, p).toBe("image_generation");
    }
  });

  test("vision / analysis requests are never turned into art direction", () => {
    for (const p of [
      "describe this photo of my kitchen",
      "Analizá esta imagen del ticket y decime qué productos aparecen",
      "What's in this screenshot?",
    ]) {
      expect(isImageGenerationRequest(p), p).toBe(false);
      expect(analyzePrompt(p, "gpt", "en", "text").meta.routing?.strategy, p).not.toBe("image_generation");
    }
  });
});

describe("developed prompts are left alone (minimal edits)", () => {
  test("a user's own detailed image prompt is returned unchanged", () => {
    const detailed =
      "Editorial photograph of a lighthouse keeper repairing a lamp at dusk, shot from a low angle with a 35mm lens, warm tungsten light from the lamp against a cold blue sky, muted teal and amber palette, visible salt texture on the glass, quiet and determined mood, composition on the rule of thirds with the lamp as the focal point, aspect ratio 4:5, avoid text and watermarks.";
    expect(isDevelopedImagePrompt(detailed)).toBe(true);
    const r = analyzePrompt(detailed, "claude", "en", "image");
    expect(r.optimizedPrompt).toBe(detailed);
    expect(r.meta.alreadyOptimized).toBe(true);
  });

  test("v1.5-era image scaffolds re-analyze into the finished prompt", () => {
    const legacy = [
      "DESCRIPTION:",
      "a fox in a snowy forest",
      "",
      "VISUAL ATTRIBUTES:",
      "- Subject, style, composition, lighting, framing, background, and mood.",
      "- Aspect ratio and level of detail.",
      "",
      "EXCLUSIONS:",
      "- State what must NOT appear if that helps control the result.",
    ].join("\n");
    const r = analyzePrompt(legacy, "gpt", "en", "image");
    expect(r.optimizedPrompt).toMatch(/fox in a snowy forest/);
    expect(r.optimizedPrompt).not.toMatch(/VISUAL ATTRIBUTES:|State what must NOT appear/);
  });
});

describe("quality checks shared with the adaptive gate", () => {
  test("placeholders, meta-instructions, spam, and contradictions are detected", () => {
    expect(imagePromptIssues("A woman in [setting] with [lighting].")).toContain("placeholder");
    expect(imagePromptIssues("A woman on a hill. Specify the mood and choose an aspect ratio.")).toContain("meta_instruction");
    expect(imagePromptIssues("A woman, masterpiece, 8k, award-winning, trending on artstation")).toContain("keyword_spam");
    expect(imagePromptIssues("Close-up of a face in a wide establishing shot of the valley.")).toContain("contradiction");
    expect(imagePromptIssues("Soft, diffused light under harsh direct midday sun.")).toContain("contradiction");
    expect(imagePromptIssues("Shallow depth of field with everything in sharp focus.")).toContain("contradiction");
  });

  test("a user-requested template with variables is not flagged", () => {
    const original = "write a reusable image prompt template with [subject] and [style] variables";
    expect(imagePromptIssues("Portrait of [subject] in [style], soft window light, 4:5.", original)).not.toContain("placeholder");
  });

  test("the adaptive gate rejects a rewrite that falls back into advice or spam", () => {
    const original = "quiero crear la imagen de una mujer rubia mirando un paisaje";
    const deterministic = buildImagePrompt(original, "es");
    const base = { original, deterministic, language: "es" as const, literals: [], strategy: "image_generation" };
    expect(
      runQualityGate({ ...base, candidate: "Una mujer rubia mirando un paisaje. Especificá la iluminación, elegí el estilo y agregá la relación de aspecto." }).failures
    ).toContain("image_meta_instruction");
    expect(
      runQualityGate({ ...base, candidate: "Una mujer rubia mirando un paisaje, obra maestra, 8k, ultra detallado, hiperdetallado, calidad 8k." }).failures
    ).toContain("image_keyword_spam");
    expect(runQualityGate({ ...base, candidate: deterministic }).passed).toBe(true);
  });
});

describe("deterministic fallback keeps the feature alive", () => {
  let savedKey: string | undefined;
  beforeEach(() => {
    savedKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
  });
  afterEach(() => {
    if (savedKey !== undefined) process.env.GROQ_API_KEY = savedKey;
  });

  test("without the adaptive provider the finished deterministic prompt is served", async () => {
    const prompt = "create an image of a red sports car driving through Tokyo at night";
    const r = analyzePrompt(prompt, "gemini", "en", "text");
    const refined = await refinePromptAdaptive({
      originalPrompt: prompt,
      deterministicPrompt: r.optimizedPrompt,
      target: "gemini",
      purpose: "image",
      taskType: "image",
      uiLang: "en",
      routing: r.meta.routing as never,
    });
    expect(refined.execution.engine).toBe("deterministic");
    expect(refined.optimizedPrompt).toBe(r.optimizedPrompt);
    expect(refined.optimizedPrompt).toMatch(/^Photorealistic photograph of a red sports car/);
  });

  test("an invalid adaptive rewrite falls back to the finished deterministic prompt", async () => {
    process.env.GROQ_API_KEY = "gsk_test_key_long_enough";
    const prompt = "minimal studio photo of a black wristwatch";
    const r = analyzePrompt(prompt, "gpt", "en", "image");
    const bad = {
      optimizedPrompt: "Minimal studio photo of a black wristwatch. Add lighting, choose a style, and specify the aspect ratio. 8k, masterpiece, award-winning.",
      summary: "Improved.",
      keyImprovements: [],
      assumptions: [],
      followUpQuestions: [],
    };
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(bad) } }] }), { status: 200 })) as unknown as typeof fetch;
    const refined = await refinePromptAdaptive({
      originalPrompt: prompt,
      deterministicPrompt: r.optimizedPrompt,
      target: "gpt",
      purpose: "image",
      taskType: "image",
      uiLang: "en",
      routing: r.meta.routing as never,
      fetchImpl,
    });
    expect(refined.execution.engine).toBe("deterministic");
    expect(refined.execution.fallbackReason).toBe("quality_gate_failed");
    expect(refined.optimizedPrompt).toBe(r.optimizedPrompt);
  });
});

describe("JSON format carries a structured art direction", () => {
  test("image requests in JSON format return image_prompt + art_direction", () => {
    const r = analyzePrompt("minimal studio photo of a black wristwatch", "gpt", "en", "image", { format: "json" });
    expect(isValidJson(r.optimizedPrompt)).toBe(true);
    const parsed = JSON.parse(r.optimizedPrompt) as Record<string, unknown>;
    expect(parsed.prompt_type).toBe("image_generation");
    expect(String(parsed.image_prompt)).toMatch(/^Minimal studio product photograph of a black wristwatch/);
    const dir = parsed.art_direction as Record<string, unknown>;
    expect(dir.aspect_ratio).toBe("1:1");
    expect(String(dir.lighting)).toMatch(/softbox/i);
    expect(Array.isArray(parsed.avoid)).toBe(true);
  });

  test("the composer exposes the same decisions it wrote into the prose", () => {
    const c = composeImagePrompt("a small dragon reading a book in a library, children's illustration", "en")!;
    expect(c.prompt).toContain(c.direction.palette);
    expect(c.direction.camera).toBeNull(); // illustration: no lens
    expect(c.brief.medium).toBe("illustration");
  });
});
