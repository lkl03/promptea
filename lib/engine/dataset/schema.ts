import type { TargetAI, TaskType } from "../../promptTemplates";
import type { Lang, PromptPurpose, RefinementStrategy } from "@/lib/domain";

export type DatasetCase = {
  id: string;
  lang: Lang;
  target: TargetAI;
  /** v1.8.0: purpose the case is analyzed under (defaults to "text"). */
  purpose?: PromptPurpose;
  /** v1.8.0: calibration bucket — within a (lang, purpose) group good > ambiguous > bad. */
  kind?: "good" | "bad" | "ambiguous";
  /** Documented category of the case (asserted only through expect.taskType). */
  taskType: TaskType | "general";
  prompt: string;

  expect: {
    scoreRange?: [number, number];
    confidenceMin?: number;

    /** v1.8.0: exact detected task type / router strategy. */
    taskType?: TaskType;
    strategy?: RefinementStrategy;

    mustHaveFindings?: string[];
    mustNotHaveFindings?: string[];

    // ✅ nuevo (PRO): recomendaciones por ID
    mustHaveRecommendations?: string[];
    mustNotHaveRecommendations?: string[];

    // ✅ legacy fallback (si querés seguir usando texto en algunos casos)
    mustHaveRecommendationText?: string[];
    optimizedPromptMustContain?: string[];
    optimizedPromptMustNotContain?: string[];

    /** v1.8.0: lower bound for meta.optimizedScore (the "after" score). */
    optimizedScoreMin?: number;
  };

  notes?: string;
};
