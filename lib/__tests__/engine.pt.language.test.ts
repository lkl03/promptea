// v1.8.2 — language detection with Portuguese added. The contract: Spanish and
// English results are exactly those of v1.8.1, and Portuguese is detected only
// from Portuguese-only signal.

import { describe, expect, test } from "vitest";
import { detectPromptLanguage, languageMatches, readsAsPortuguese, vocabularyLang } from "@/lib/refine/language";

const PT = [
  "Escreva um e-mail para o meu chefe pedindo uma reunião na próxima semana.",
  "Preciso de um resumo deste texto em 5 tópicos, com tom formal.",
  "Quero que você explique o que é uma função recursiva para iniciantes.",
  "Crie uma landing page para uma cafeteria em São Paulo. Público: jovens de 20 a 30 anos.",
  "Estou com um erro no meu código em Python: não consigo fazer o login funcionar.",
  "Traduza o texto abaixo para o inglês, mantendo o tom informal.",
  "Gere 5 títulos de anúncio para um curso de inglês online, com no máximo 30 caracteres.",
  "me ajude a melhorar esse prompt",
  "Você é um analista de dados. Extraia os campos nome, e-mail e telefone e devolva em JSON.",
];

const ES = [
  "Escribí un mail para mi jefe pidiendo una reunión la semana que viene.",
  "Necesito un resumen de este texto en 5 viñetas, con tono formal.",
  "Quiero que me expliques qué es una función recursiva para principiantes.",
  "Tengo un error en mi código de Python: no puedo hacer que funcione el login.",
  "Traducí el siguiente texto al inglés manteniendo el tono informal.",
  "Explique el concepto y resuma los puntos clave para la clase.",
  "Corrija el texto y liste los errores que encuentre.",
];

const EN = [
  "Write an email to my boss asking for a meeting next week.",
  "I need a summary of this text in 5 bullets, with a formal tone.",
  "Explain what a recursive function is for beginners.",
  "Contact me at ana@example.com and tell Tom what the error is.",
  "Do the following: create a function that returns the sum of two numbers.",
];

describe("detectPromptLanguage: three languages", () => {
  test.each(PT)("pt: %s", (text) => {
    expect(detectPromptLanguage(text, "en").lang).toBe("pt");
    expect(detectPromptLanguage(text, "es").lang).toBe("pt");
  });

  test.each(ES)("es: %s", (text) => {
    expect(detectPromptLanguage(text, "en").lang).toBe("es");
    expect(detectPromptLanguage(text, "pt").lang).toBe("es");
  });

  test.each(EN)("en: %s", (text) => {
    expect(detectPromptLanguage(text, "es").lang).toBe("en");
    expect(detectPromptLanguage(text, "pt").lang).toBe("en");
  });

  test("too little signal → the fallback, whatever it is", () => {
    for (const fb of ["es", "en", "pt"] as const) {
      expect(detectPromptLanguage("", fb)).toEqual({ lang: fb, confidence: 0 });
      expect(detectPromptLanguage("JSON", fb).lang).toBe(fb);
      expect(detectPromptLanguage("12345 !!!", fb).lang).toBe(fb);
    }
  });

  test("a domain name is not the Portuguese preposition", () => {
    expect(detectPromptLanguage("see example.com and docs.github.com for the API", "en").lang).toBe("en");
  });

  test("code-heavy prompts keep the language of their prose", () => {
    const code = "```ts\nconst e = em.find(a => a.um === 1);\n```";
    expect(detectPromptLanguage(`Fix this function, it throws an error when the list is empty.\n${code}`, "es").lang).toBe("en");
    expect(detectPromptLanguage(`Corrija esta função, ela dá erro quando a lista está vazia.\n${code}`, "en").lang).toBe("pt");
  });
});

describe("languageMatches", () => {
  test("a Portuguese rewrite matches pt and clearly does not match es/en", () => {
    const pt = "Escreva um e-mail formal para o seu gerente pedindo uma reunião; inclua o objetivo e as datas possíveis.";
    expect(languageMatches(pt, "pt")).toBe(true);
    expect(languageMatches(pt, "en")).toBe(false);
    expect(languageMatches(pt, "es")).toBe(false);
  });

  test("an English or Spanish rewrite does not pass as Portuguese", () => {
    expect(languageMatches("Write a formal email to your manager asking for a meeting and include the goal.", "pt")).toBe(false);
    expect(languageMatches("Escribí un mail formal para tu gerente pidiendo una reunión e incluí el objetivo.", "pt")).toBe(false);
  });
});

describe("vocabularyLang: which vocabulary the engine reads a prompt with", () => {
  test("Spanish and English interfaces keep their own vocabulary for their own prompts", () => {
    expect(vocabularyLang(ES[0], "es")).toBe("es");
    expect(vocabularyLang(EN[0], "en")).toBe("en");
    // v1.8.1 behaviour: the interface decides between es and en
    expect(vocabularyLang(EN[0], "es")).toBe("es");
    expect(vocabularyLang(ES[0], "en")).toBe("en");
  });

  test("a Portuguese prompt is read as Portuguese from any interface", () => {
    for (const ui of ["es", "en", "pt"] as const) expect(vocabularyLang(PT[0], ui)).toBe("pt");
    expect(readsAsPortuguese(PT[3], "en")).toBe(true);
  });

  test("under the Portuguese interface: a clear es/en prompt uses its language, a weak one uses pt", () => {
    expect(vocabularyLang(EN[0], "pt")).toBe("en");
    expect(vocabularyLang(ES[0], "pt")).toBe("es");
    expect(vocabularyLang("JSON", "pt")).toBe("pt");
  });
});
