export type TelemetryEventName = "analyze" | "copy" | "feedback";

export type TelemetryEvent = {
  name: TelemetryEventName;
  ts: string; // ISO
  sessionId: string; // anónimo
  analysisId?: string; // optional: ID of the analysis result
  projectId?: string | null; // optional: Firebase project ID
  engineVersion: string;

  lang?: "es" | "en";
  target?: string;
  taskType?: string;

  score?: number;
  confidence?: number;
  words?: number;
  approxTokens?: number;

  outputFormatKind?: string | null;
  outputFormatStrict?: boolean | null;

  findingIds?: string[];
  recoIds?: string[];

  optimizedCopied?: boolean;

  helpful?: "yes" | "no";
  // categorías sin texto libre
  reason?:
    | "too_generic"
    | "wrong_format"
    | "missed_context"
    | "too_long"
    | "too_short"
    | "other"
    | null;
};
