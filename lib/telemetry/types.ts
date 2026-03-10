export type TelemetryEventName = "analyze" | "copy" | "feedback";

export type TelemetryEvent = {
  name: TelemetryEventName;
  ts: string;
  sessionId: string;
  analysisId?: string;
  projectId?: string | null;
  engineVersion: string;

  lang?: "es" | "en";
  target?: string;
  taskType?: string;
  purpose?: string | null;

  score?: number;
  confidence?: number;
  words?: number;
  approxTokens?: number;

  outputFormatKind?: string | null;
  outputFormatStrict?: boolean | null;

  findingIds?: string[];
  recoIds?: string[];

  // nuevo: metadata de adjuntos
  attachmentsCount?: number;
  attachmentKinds?: string[];
  attachmentExts?: string[];
  attachmentMimes?: string[];

  optimizedCopied?: boolean;

  helpful?: "yes" | "no";
  reason?:
    | "too_generic"
    | "wrong_format"
    | "missed_context"
    | "too_long"
    | "too_short"
    | "other"
    | null;
};