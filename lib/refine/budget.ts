// lib/refine/budget.ts
//
// Deliberate input-budget strategy for long prompts sent to the refinement
// LLM. Never blindly truncate the head or tail: long prompts often carry
// critical requirements at the END, and constraints in the middle.
//
// Strategy for over-budget input:
//   keep the beginning (goal/setup), keep lines that look like explicit
//   requirements/constraints/output specs, and keep the ending — drop the
//   least informative middle, marking the elision explicitly.

const REQUIREMENT_LINE =
  /^(\s*[-*•]\s+|\s*\d+[.)]\s+)|(\b(must|should|require|debe|deber[ií]a|requisito|restricci[oó]n|constraint|output|formato|format|entreg|deliver|no\s+(?:uses|incluyas|use|include)|don'?t|never|nunca|siempre|always|max|m[aá]ximo|min|m[ií]nimo)\b)/i;

export type BudgetedInput = {
  text: string;
  truncated: boolean;
  originalLength: number;
};

/**
 * Fit `text` into `maxChars`, preserving head, requirement-looking lines,
 * and tail. `[...]` marks elided content so the model knows text is missing.
 */
export function budgetPromptInput(text: string, maxChars: number): BudgetedInput {
  const src = String(text ?? "");
  if (src.length <= maxChars) {
    return { text: src, truncated: false, originalLength: src.length };
  }

  const marker = "\n[...]\n";
  const headBudget = Math.floor(maxChars * 0.45);
  const tailBudget = Math.floor(maxChars * 0.25);
  const middleBudget = maxChars - headBudget - tailBudget - marker.length * 2;

  const head = src.slice(0, headBudget);
  const tail = src.slice(-tailBudget);

  // From the middle section, keep only requirement-looking lines up to budget.
  const middle = src.slice(headBudget, src.length - tailBudget);
  const keptLines: string[] = [];
  let used = 0;
  for (const line of middle.split("\n")) {
    if (!REQUIREMENT_LINE.test(line)) continue;
    const cost = line.length + 1;
    if (used + cost > middleBudget) break;
    keptLines.push(line);
    used += cost;
  }

  const middlePart = keptLines.length > 0 ? keptLines.join("\n") : "";
  const parts = middlePart ? [head, marker, middlePart, marker, tail] : [head, marker, tail];

  return { text: parts.join(""), truncated: true, originalLength: src.length };
}
