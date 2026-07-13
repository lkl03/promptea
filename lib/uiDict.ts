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

export type UiDict = {
  app: AppDict;
  analyzer: AnalyzerDict;
  results: ResultsDict;
};
