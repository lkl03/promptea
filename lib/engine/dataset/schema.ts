import type { TargetAI, TaskType } from "../../promptTemplates";

export type DatasetCase = {
  id: string;
  lang: "es" | "en";
  target: TargetAI;
  taskType: TaskType;
  prompt: string;

  expect: {
    scoreRange?: [number, number];
    confidenceMin?: number;

    mustHaveFindings?: string[];
    mustNotHaveFindings?: string[];

    // ✅ nuevo (PRO): recomendaciones por ID
    mustHaveRecommendations?: string[];
    mustNotHaveRecommendations?: string[];

    // ✅ legacy fallback (si querés seguir usando texto en algunos casos)
    mustHaveRecommendationText?: string[];
    optimizedPromptMustNotContain?: string[];
  };

  notes?: string;
};
