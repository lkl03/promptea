import { z } from "zod";

export const PurposeSchema = z.enum([
  "text",     // escribir/explicar
  "study",    // estudiar/aprender
  "code",     // programar
  "data",     // extracción/JSON/tablas
  "image",    // generación de imagen
  "marketing" // copy/ventas
]);

export type PromptPurpose = z.infer<typeof PurposeSchema>;

export const AnalyzeSchema = z.object({
  prompt: z.string().min(1).max(20000),
  target: z.enum(["gpt", "gemini", "grok", "claude", "kimi", "deepseek"]),
  lang: z.enum(["es", "en"]),
  sessionId: z.string().min(10),
  purpose: PurposeSchema,
});
