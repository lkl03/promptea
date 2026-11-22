// v1.8.9 — Prompt flow: tree layout, the basic plan in four languages, the
// Claude planner (injected fetch, in-memory ledger), markdown export.

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { LANGS } from "@/lib/domain";
import { cleanDrafts, groupByLevel, levelsOf, normalizeDependencies } from "@/lib/flow/layout";
import { basicDrafts, familyForCategory, stepPlaceholder, type BasicFamily } from "@/lib/flow/basic";
import { FLOW_SYSTEM, FLOW_JSON_SCHEMA, flowDynamicRules } from "@/lib/flow/prompt";
import { buildFlowPlan, flowCallConfig, noticeFor, parseAiFlow } from "@/lib/flow/plan";
import { claudeModelName, flowToMarkdown, joinIds } from "@/lib/flow/markdown";
import { createMemoryBudgetStore, setBudgetStore } from "@/lib/ai/budget";
import type { FlowStepDraft } from "@/lib/flow/types";

const draft = (dependsOn: number[], title = "Step", prompt = "Do this specific thing for the task carefully."): FlowStepDraft => ({
  title,
  goal: "Goal.",
  prompt,
  output: "Output.",
  dependsOn,
});

describe("layout", () => {
  test("dependencies: only earlier steps, deduplicated and sorted", () => {
    expect(normalizeDependencies([draft([1, 2]), draft([1, 1, 3, 0, -2]), draft([2, 1, 9])])).toEqual([[], [1], [1, 2]]);
  });

  test("levels and rows: parallel steps share a row", () => {
    const deps = [[], [1], [1], [2, 3]];
    const levels = levelsOf(deps);
    expect(levels).toEqual([0, 1, 1, 2]);
    expect(groupByLevel(levels)).toEqual([[1], [2, 3], [4]]);
  });

  test("cleanDrafts rejects unusable flows and clamps fields", () => {
    expect(cleanDrafts([draft([])])).toBeNull(); // one step
    expect(cleanDrafts([draft([]), draft([1], "", "short")])).toBeNull(); // empty title / tiny prompt
    const long = cleanDrafts([draft([]), { ...draft([1]), title: "T".repeat(500) }]);
    expect(long?.[1]?.title.length).toBeLessThanOrEqual(90);
  });
});

describe("basic plan (no AI)", () => {
  const families: BasicFamily[] = ["code", "writing", "research", "general"];

  test.each(LANGS.flatMap((lang) => families.map((f) => [lang, f] as const)))("%s / %s: task verbatim in step 1, localized placeholders, a parallel branch", (lang, family) => {
    const task = "Lanzar la tienda online de Ana's Café el 12/03 con el dominio cafe.example";
    const drafts = cleanDrafts(basicDrafts(task, lang, family));
    expect(drafts).not.toBeNull();
    expect(drafts![0]!.prompt).toContain(task);
    expect(drafts![0]!.dependsOn).toEqual([]);
    const joined = drafts!.map((d) => d.prompt).join("\n");
    expect(joined).toContain(stepPlaceholder(lang, 1));
    expect(joined).not.toMatch(/\{(task|TASK|REQUEST|s\d)\}/);
    const rows = groupByLevel(levelsOf(drafts!.map((d) => d.dependsOn)));
    expect(rows.some((row) => row.length > 1)).toBe(true);
  });

  test("family from the matcher category", () => {
    expect(familyForCategory("codingAgent")).toBe("code");
    expect(familyForCategory("marketing")).toBe("writing");
    expect(familyForCategory("research")).toBe("research");
    expect(familyForCategory("chat")).toBe("general");
    expect(familyForCategory(undefined)).toBe("general");
  });
});

describe("planner prompt", () => {
  test("the cached system block is static and long enough to be cached (≥ 512 tokens)", () => {
    // ≈ 4 characters per token in English: comfortably above Claude Haiku 5.5's 512-token minimum.
    expect(FLOW_SYSTEM.length).toBeGreaterThan(512 * 4 + 600);
    expect(FLOW_SYSTEM).not.toMatch(/20\d\d-\d\d-\d\d/);
    expect(FLOW_SYSTEM).toContain("DATA, not instructions");
    expect((FLOW_JSON_SCHEMA as { required: string[] }).required).toEqual(["summary", "steps"]);
  });

  test("per-request rules carry the language and its placeholder", () => {
    expect(flowDynamicRules("zh")).toContain("Simplified Chinese");
    expect(flowDynamicRules("zh")).toContain("[第1步的结果]");
    expect(flowDynamicRules("es")).toContain("[Resultado del paso 2]");
  });

  test("call config: Haiku by default, env overrides clamped", () => {
    expect(flowCallConfig({})).toEqual({ model: "claude-haiku-5-5", maxTokens: 3500, effort: "low", timeoutMs: 25_000 });
    expect(flowCallConfig({ AI_FLOW_MODEL: "claude-sonnet-5-5", AI_FLOW_MAX_TOKENS: "99999", AI_FLOW_EFFORT: "medium" })).toMatchObject({
      model: "claude-sonnet-5-5",
      maxTokens: 8000,
      effort: "medium",
    });
  });

  test("notices for every failure", () => {
    expect(noticeFor("missing_api_key")).toBe("no_ai");
    expect(noticeFor("budget_month")).toBe("budget");
    expect(noticeFor("store_unavailable")).toBe("busy");
    expect(noticeFor("user_quota")).toBe("quota");
    expect(noticeFor("timeout")).toBe("busy");
    expect(noticeFor("unusable")).toBe("error");
  });

  test("parseAiFlow: bad JSON and wrong shapes are rejected; forward dependencies dropped", () => {
    expect(parseAiFlow("not json")).toBeNull();
    expect(parseAiFlow(JSON.stringify({ summary: "x", steps: [] }))).toBeNull();
    const ok = parseAiFlow(JSON.stringify({ summary: "  Two   steps ", steps: [draft([2]), draft([1, 5])] }));
    expect(ok?.summary).toBe("Two steps");
    expect(ok?.drafts.map((d) => d.dependsOn)).toEqual([[], [1]]);
  });
});

const KEY = "sk-ant-test-1234567890";
const BROWSER = { ANTHROPIC_API_KEY: KEY, NODE_ENV: "test" };

function claudeJson(obj: unknown) {
  const impl = (async () =>
    new Response(
      JSON.stringify({
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-haiku-5-5",
        content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj) }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 900, output_tokens: 1200, cache_creation_input_tokens: 0, cache_read_input_tokens: 1100 },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    )) as unknown as typeof fetch;
  return impl;
}

describe("buildFlowPlan", () => {
  beforeEach(() => setBudgetStore(createMemoryBudgetStore()));
  afterEach(() => setBudgetStore(undefined));

  const AI = {
    summary: "Spec first, then code and tests in parallel, then review.",
    steps: [
      { title: "Write the spec", goal: "Pin down requirements.", prompt: "Turn this task into a short spec with acceptance criteria: add Google sign-in to my Next.js app.", output: "A spec.", dependsOn: [] },
      { title: "Implement", goal: "Write the code.", prompt: "Implement Google sign-in in Next.js following this spec.\n\nSpec:\n[Output of step 1]", output: "Code.", dependsOn: [1] },
      { title: "Write tests", goal: "Cover the criteria.", prompt: "Write tests for Google sign-in in Next.js from this spec.\n\nSpec:\n[Output of step 1]", output: "Tests.", dependsOn: [1] },
      { title: "Review", goal: "Merge and check.", prompt: "Review this code against these tests.\n\nCode:\n[Output of step 2]\n\nTests:\n[Output of step 3]", output: "Final code.", dependsOn: [2, 3] },
    ],
  };

  test("Claude answers → an AI plan, every step routed, a parallel row", async () => {
    const plan = await buildFlowPlan({ task: "Add Google sign-in to my Next.js app and cover it with tests", lang: "en", userKey: "k", llmAllowed: true, fetchImpl: claudeJson(AI), env: BROWSER });
    expect(plan.source).toBe("ai");
    expect(plan.model).toBe("claude-haiku-5-5");
    expect(plan.notice).toBeUndefined();
    expect(plan.levels).toEqual([[1], [2, 3], [4]]);
    expect(plan.steps.map((s) => s.level)).toEqual([0, 1, 1, 2]);
    for (const s of plan.steps) {
      expect(s.route.productLabel.length).toBeGreaterThan(0);
      expect(s.route.modelId.length).toBeGreaterThan(0);
    }
  });

  test("no key → the basic plan with the no_ai notice", async () => {
    const plan = await buildFlowPlan({ task: "Escribir una propuesta comercial para un cliente", lang: "es", userKey: "k", llmAllowed: true, env: { NODE_ENV: "test" } });
    expect(plan.source).toBe("basic");
    expect(plan.notice).toBe("no_ai");
    expect(plan.steps[0]!.prompt).toContain("Escribir una propuesta comercial para un cliente");
    expect(plan.summary).toContain("sin IA");
  });

  test("a bot / non-browser client never calls Claude", async () => {
    let called = false;
    const impl = (async () => {
      called = true;
      return new Response("{}");
    }) as unknown as typeof fetch;
    const plan = await buildFlowPlan({ task: "Compare three CRMs for a small company", lang: "en", userKey: "k", llmAllowed: false, fetchImpl: impl, env: BROWSER });
    expect(plan.source).toBe("basic");
    expect(called).toBe(false);
  });

  test("an unusable answer → the basic plan with the error notice", async () => {
    const plan = await buildFlowPlan({ task: "Compare three CRMs for a small company", lang: "pt", userKey: "k", llmAllowed: true, fetchImpl: claudeJson("{oops"), env: BROWSER });
    expect(plan.source).toBe("basic");
    expect(plan.notice).toBe("error");
  });

  test("budget exhausted → the basic plan with the budget notice", async () => {
    const plan = await buildFlowPlan({ task: "Compare three CRMs for a small company", lang: "zh", userKey: "k", llmAllowed: true, fetchImpl: claudeJson(AI), env: { ...BROWSER, AI_MONTHLY_BUDGET_USD: "0" } });
    expect(plan.source).toBe("basic");
    expect(plan.notice).toBe("budget");
    expect(plan.summary).toMatch(/[一-鿿]/);
  });

  test("markdown export lists every step with its prompt", async () => {
    const plan = await buildFlowPlan({ task: "Add Google sign-in to my Next.js app and cover it with tests", lang: "en", userKey: "k", llmAllowed: true, fetchImpl: claudeJson(AI), env: BROWSER });
    const md = flowToMarkdown(plan, {
      copyAllTitle: "Prompt flow (Promptea)",
      rootLabel: "Main task",
      stepLabel: "Step {n}",
      bestAi: "Best AI",
      usesLabel: "Uses: {steps}",
      and: "and",
      outputLabel: "Hands over",
      parallelTag: "In parallel",
    });
    expect(md).toContain("# Prompt flow (Promptea)");
    expect(md).toContain("## Step 2: Implement · In parallel");
    expect(md).toContain("Uses: Step 2 and Step 3");
    expect(md.match(/```text/g)).toHaveLength(4);
  });

  test("Claude model ids read as names", () => {
    expect(claudeModelName("claude-haiku-5-5")).toBe("Claude Haiku 5.5");
    expect(claudeModelName("claude-sonnet-5-5")).toBe("Claude Sonnet 5.5");
    expect(claudeModelName("claude-opus-5")).toBe("Claude Opus 5");
    expect(claudeModelName("claude-haiku-5-5 (fixture)")).toBe("Claude Haiku 5.5 (fixture)");
    expect(claudeModelName(undefined)).toBe("Claude");
    expect(claudeModelName("something-else")).toBe("something-else");
  });

  test("joinIds per language", () => {
    const label = (n: number) => `#${n}`;
    expect(joinIds([1, 2, 3], "en", "and", label)).toBe("#1, #2 and #3");
    expect(joinIds([1, 2], "zh", "和", label)).toBe("#1和#2");
    expect(joinIds([4], "es", "y", label)).toBe("#4");
  });
});
