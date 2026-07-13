import { z } from "zod";
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/attachments";
import { PURPOSES, TARGETS, LANGS, FORMAT_CHOICES } from "@/lib/domain";

// Schemas derive from the canonical domain arrays so API validation can
// never drift from the UI or engine unions.
export const PurposeSchema = z.enum(PURPOSES);

export type PromptPurpose = z.infer<typeof PurposeSchema>;

export const AttachmentInputSchema = z.object({
  name: z.string().min(1).max(120),
  mime: z.string().max(120).optional().nullable(),
  text: z.string().min(1).max(30000),
  size: z.number().int().min(0).max(MAX_ATTACHMENT_SIZE_BYTES),
});

export const AnalyzeSchema = z.object({
  prompt: z.string().min(1).max(20000),
  target: z.enum(TARGETS),
  lang: z.enum(LANGS),
  sessionId: z.string().min(10),
  purpose: PurposeSchema,
  attachments: z.array(AttachmentInputSchema).max(MAX_ATTACHMENTS).optional(),
  format: z.enum(FORMAT_CHOICES).optional(),
  modelId: z.string().min(1).max(80).optional().nullable(),
});
