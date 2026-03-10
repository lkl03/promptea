import type { PromptPurpose } from "@/lib/engine/types";

export const MAX_ATTACHMENTS = 3;
export const MAX_ATTACHMENT_SIZE_BYTES = 250 * 1024;
export const MAX_TOTAL_ATTACHMENT_SIZE_BYTES = 600 * 1024;
export const MAX_ATTACHMENT_TEXT_CHARS = 12000;
export const MAX_TOTAL_ATTACHMENT_TEXT_CHARS = 24000;

export const ATTACHMENT_ENABLED_PURPOSES: PromptPurpose[] = [
  "text",
  "study",
  "code",
  "data",
  "marketing",
  "translation",
  "summarization",
];

export const SUPPORTED_ATTACHMENT_EXTENSIONS = [
  "txt",
  "md",
  "markdown",
  "json",
  "jsonl",
  "csv",
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "java",
  "go",
  "rs",
  "rb",
  "php",
  "swift",
  "kt",
  "kts",
  "scala",
  "sql",
  "css",
  "scss",
  "html",
  "xml",
  "yaml",
  "yml",
  "toml",
  "ini",
  "env",
  "sh",
  "bash",
  "zsh",
  "log",
] as const;

export type SupportedAttachmentExtension = (typeof SUPPORTED_ATTACHMENT_EXTENSIONS)[number];

export type AttachmentKind =
  | "text"
  | "markdown"
  | "json"
  | "csv"
  | "code"
  | "log"
  | "html"
  | "xml"
  | "yaml";

export type AttachmentInput = {
  name: string;
  mime?: string | null;
  text: string;
  size: number;
};

export type AttachmentContext = {
  name: string;
  mime: string;
  ext: string;
  kind: AttachmentKind;
  text: string;
  size: number;
  truncated: boolean;
  removedLines: number;
};

export type AttachmentSummary = {
  count: number;
  totalChars: number;
  names: string[];
  hasLogs: boolean;
  hasCode: boolean;
  hasStructuredData: boolean;
  hasLongContext: boolean;
};

function normalizeWhitespace(input: string) {
  return String(input ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();
}

export function getExtension(name: string) {
  const clean = String(name ?? "").trim().toLowerCase();
  const dot = clean.lastIndexOf(".");
  if (dot < 0) return "";
  return clean.slice(dot + 1);
}

export function isPurposeAttachmentEnabled(purpose: PromptPurpose | null | undefined) {
  return !!purpose && ATTACHMENT_ENABLED_PURPOSES.includes(purpose);
}

export function inferAttachmentKind(name: string, mime?: string | null): AttachmentKind {
  const ext = getExtension(name);
  const lowMime = String(mime ?? "").toLowerCase();

  if (ext === "json" || ext === "jsonl" || lowMime.includes("json")) return "json";
  if (ext === "csv" || lowMime.includes("csv")) return "csv";
  if (ext === "md" || ext === "markdown") return "markdown";
  if (ext === "log") return "log";
  if (ext === "html") return "html";
  if (ext === "xml") return "xml";
  if (ext === "yaml" || ext === "yml" || ext === "toml" || ext === "ini" || ext === "env") return "yaml";

  if (
    [
      "ts",
      "tsx",
      "js",
      "jsx",
      "mjs",
      "cjs",
      "py",
      "java",
      "go",
      "rs",
      "rb",
      "php",
      "swift",
      "kt",
      "kts",
      "scala",
      "sql",
      "css",
      "scss",
      "sh",
      "bash",
      "zsh",
    ].includes(ext)
  ) {
    return "code";
  }

  return "text";
}

export function isSupportedAttachment(name: string, mime?: string | null) {
  const ext = getExtension(name);
  if (SUPPORTED_ATTACHMENT_EXTENSIONS.includes(ext as SupportedAttachmentExtension)) return true;

  const lowMime = String(mime ?? "").toLowerCase();
  return (
    lowMime.startsWith("text/") ||
    lowMime.includes("json") ||
    lowMime.includes("csv") ||
    lowMime.includes("xml") ||
    lowMime.includes("yaml")
  );
}

function sanitizeFileName(name: string) {
  const base = String(name ?? "attachment")
    .replace(/[\\/]+/g, "-")
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .trim();

  return base.slice(0, 80) || "attachment.txt";
}

function sanitizeAttachmentText(text: string) {
  const blockedLinePatterns = [
    /ignore\s+previous\s+instructions?/i,
    /system\s+prompt/i,
    /developer\s+message/i,
    /reveal\s+.*(prompt|instructions?|token|secret)/i,
    /api\s*key/i,
    /access\s*token/i,
    /olvid(a|á)\s+las\s+instrucciones?/i,
    /mensaje\s+del\s+desarrollador/i,
    /instrucciones\s+ocultas/i,
  ];

  let removedLines = 0;

  const kept = normalizeWhitespace(text)
    .split("\n")
    .filter((line) => {
      const hit = blockedLinePatterns.some((re) => re.test(line));
      if (hit) removedLines += 1;
      return !hit;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text: kept, removedLines };
}

export function normalizeAnalyzeAttachments(input: AttachmentInput[] | undefined, purpose: PromptPurpose) {
  const raw = Array.isArray(input) ? input : [];

  if (raw.length === 0) return [] as AttachmentContext[];

  if (!isPurposeAttachmentEnabled(purpose)) {
    throw new Error("Attachments are not available for this prompt type yet.");
  }

  if (raw.length > MAX_ATTACHMENTS) {
    throw new Error(`You can upload up to ${MAX_ATTACHMENTS} files.`);
  }

  let totalBytes = 0;
  let totalChars = 0;

  const normalized: AttachmentContext[] = raw.map((item) => {
    const name = sanitizeFileName(item?.name);
    const mime = String(item?.mime ?? "text/plain").slice(0, 120);
    const size = Number(item?.size ?? 0);

    if (!isSupportedAttachment(name, mime)) {
      throw new Error(`Unsupported file type: ${name}`);
    }

    if (!Number.isFinite(size) || size < 0 || size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new Error(`File is too large: ${name}`);
    }

    const clean = sanitizeAttachmentText(String(item?.text ?? ""));
    if (!clean.text) {
      throw new Error(`File is empty or unreadable: ${name}`);
    }

    totalBytes += size;
    if (totalBytes > MAX_TOTAL_ATTACHMENT_SIZE_BYTES) {
      throw new Error("Total attachment size is too large.");
    }

    const remainingChars = Math.max(0, MAX_TOTAL_ATTACHMENT_TEXT_CHARS - totalChars);
    if (remainingChars <= 0) {
      throw new Error("Attached text is too long. Remove one file or shorten the content.");
    }

    const limitedText = clean.text.slice(0, Math.min(MAX_ATTACHMENT_TEXT_CHARS, remainingChars)).trim();
    if (!limitedText) {
      throw new Error(`File is too large after trimming: ${name}`);
    }

    totalChars += limitedText.length;

    return {
      name,
      mime,
      ext: getExtension(name),
      kind: inferAttachmentKind(name, mime),
      text: limitedText,
      size,
      truncated: limitedText.length < clean.text.length,
      removedLines: clean.removedLines,
    } satisfies AttachmentContext;
  });

  return normalized;
}

export function summarizeAttachments(items: AttachmentContext[]): AttachmentSummary {
  const names = items.map((item) => item.name);
  const totalChars = items.reduce((acc, item) => acc + item.text.length, 0);

  return {
    count: items.length,
    totalChars,
    names,
    hasLogs: items.some(
      (item) => item.kind === "log" || /(error|exception|trace|stack|fail)/i.test(item.text.slice(0, 1200))
    ),
    hasCode: items.some(
      (item) => item.kind === "code" || item.kind === "json" || item.kind === "html" || item.kind === "xml"
    ),
    hasStructuredData: items.some(
      (item) => item.kind === "json" || item.kind === "csv" || item.kind === "xml" || item.kind === "yaml"
    ),
    hasLongContext: totalChars >= 1200,
  };
}

export const ATTACHMENT_ACCEPT = SUPPORTED_ATTACHMENT_EXTENSIONS.map((ext) => `.${ext}`).join(",");

export async function fileToAttachmentInput(file: File): Promise<AttachmentInput> {
  const text = await file.text();

  return {
    name: file.name,
    mime: file.type || "text/plain",
    text,
    size: file.size,
  };
}