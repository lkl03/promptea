export type Lang = "es" | "en";

export type Severity = "low" | "medium" | "high";
export type Impact = "low" | "medium" | "high";

export type FindingId =
  | "too_short"
  | "missing_goal"
  | "missing_context"
  | "missing_input_data"
  | "missing_output_format"
  | "missing_constraints"
  | "contradiction"
  | "prompt_injection"
  | "missing_repro_steps"
  | "missing_error_message"
  | "missing_environment"
  | "missing_schema"
  | "missing_summary_scope"
  | "missing_summary_length"
  | "missing_translation_target"
  | "missing_translation_register"
  | "missing_study_level"
  | "missing_marketing_audience"
  | "missing_marketing_cta";

export type RecommendationId =
  | "add_goal"
  | "add_context"
  | "add_input_data"
  | "define_output_format"
  | "add_constraints"
  | "add_success_criteria"
  | "add_examples"
  | "add_schema"
  | "add_repro_steps"
  | "add_error_message"
  | "add_environment"
  | "define_summary_scope"
  | "define_summary_length"
  | "define_translation_target"
  | "define_translation_register"
  | "define_study_level"
  | "define_marketing_audience"
  | "define_marketing_cta";

export type OutputFormatKind = "json" | "table" | "steps" | "bullets";

export type OutputFormat = {
  kind: OutputFormatKind;
  strict: boolean;
};

export type LintFinding = {
  id: FindingId;
  severity: Severity;
  title: string;
  description: string;
  fix: string;
};

export type LintRecommendation = {
  id: RecommendationId;
  impact: Impact;
  title: string;
  detail: string;
};

export type LintResult = {
  outputFormat?: { kind: "json" | "table" | "steps" | "bullets"; strict: boolean } | null;
  findings: LintFinding[];
  recommendations: LintRecommendation[];
};