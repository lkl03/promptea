// lib/uiDict.ts
//
// Typed shape of the localization dictionaries (app/[lang]/dictionaries/*).
// The parity test (lib/__tests__/i18n.parity.test.ts) keeps es/en in sync.

export type AppDict = Record<string, string>;

export type AnalyzerDict = {
  purposeLabel: string;
  providerPlaceholder: string;
  modelHelper: string;
  modelLabel: string;
  modelPlaceholderDisabled: string;
  modelPlaceholderEnabled: string;
  words_one: string;
  words_other: string;
  tokensApprox: string;
  tryExample: string;
  confirmReplaceExample: string;
  attachButton: string;
  attachHintNoPurpose: string;
  attachHintImage: string;
  attachHint: string;
  attachCount: string;
  attachRemove: string;
  attachTooMany: string;
  attachTooLarge: string;
  attachTotalTooLarge: string;
  attachReadError: string;
  formatLabel: string;
  formatChecklist: string;
  formatJson: string;
  analyzingSteps: string[];
  promptLoaded: string;
  genericError: string;
  editorLabel: string;
};

export type ResultsDict = Record<string, string>;

// ── v1.3.0 sections ─────────────────────────────────────────────────────────

/** Two-mode switcher (Improve Prompt / Find the Best AI). */
export type ModeDict = {
  improveLabel: string;
  bestAiLabel: string;
  improveHint: string;
  bestAiHint: string;
  switcherAria: string;
};

/** Find the Best AI experience. */
export type MatcherDict = {
  title: string;
  subtitle: string;
  editorLabel: string;
  submitCta: string;
  analyzing: string;
  bestFit: string;
  matchScore: string;
  confidenceLabel: string;
  confidenceHigh: string;
  confidenceMedium: string;
  confidenceLow: string;
  tieNote: string;
  reasonsTitle: string;
  signalsTitle: string;
  alternativesTitle: string;
  bestAtLabel: string;
  tradeoffLabel: string;
  adaptationTitle: string;
  switchingTitle: string;
  improveCta: string;
  lowConfidenceHint: string;
  emptyPrompt: string;
  genericError: string;
  recommendedModel: string;
};

/** Voice input (both modes). */
export type VoiceDict = {
  start: string;
  stop: string;
  cancel: string;
  retry: string;
  recording: string;
  processing: string;
  reviewTitle: string;
  reviewHint: string;
  insert: string;
  append: string;
  discard: string;
  limitsHint: string;
  errorPermissionDenied: string;
  errorNoMicrophone: string;
  errorUnsupported: string;
  errorInsecureContext: string;
  errorEmptyAudio: string;
  errorNoSpeech: string;
  errorTooLarge: string;
  errorTooLong: string;
  errorUnsupportedMedia: string;
  errorTimeout: string;
  errorRateLimited: string;
  errorProvider: string;
  errorNetwork: string;
  errorGeneric: string;
};

/** General app feedback modal (stored in Firestore). */
export type AppFeedbackDict = {
  open: string;
  title: string;
  subtitle: string;
  messageLabel: string;
  messagePlaceholder: string;
  categoryLabel: string;
  categoryBug: string;
  categorySuggestion: string;
  categoryDesign: string;
  categoryResultQuality: string;
  categoryOther: string;
  submit: string;
  cancel: string;
  submitting: string;
  success: string;
  errorTooShort: string;
  errorTooLong: string;
  errorCooldown: string;
  errorGeneric: string;
  close: string;
};

export type UiDict = {
  app: AppDict;
  analyzer: AnalyzerDict;
  results: ResultsDict;
  mode: ModeDict;
  matcher: MatcherDict;
  voice: VoiceDict;
  appFeedback: AppFeedbackDict;
};
