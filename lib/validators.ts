import { z } from "zod";
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/attachments";

export const PurposeSchema = z.enum([
  "text",
  "study",
  "code",
  "data",
  "image",
  "marketing",
  "translation",
  "summarization",
]);

export type PromptPurpose = z.infer<typeof PurposeSchema>;

export const AttachmentInputSchema = z.object({
  name: z.string().min(1).max(120),
  mime: z.string().max(120).optional().nullable(),
  text: z.string().min(1).max(30000),
  size: z.number().int().min(0).max(MAX_ATTACHMENT_SIZE_BYTES),
});

export const AnalyzeSchema = z.object({
  prompt: z.string().min(1).max(20000),
  target: z.enum(["gpt", "gemini", "grok", "claude", "kimi", "deepseek"]),
  lang: z.enum(["es", "en"]),
  sessionId: z.string().min(10),
  purpose: PurposeSchema,
  attachments: z.array(AttachmentInputSchema).max(MAX_ATTACHMENTS).optional(),
});
