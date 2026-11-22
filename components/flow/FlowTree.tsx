"use client";

// components/flow/FlowTree.tsx
//
// v1.8.9 — the prompt flow drawn as a tree: the main task on top, then one row
// per level. Steps on the same row are independent ("in parallel"); a row
// waits for the rows above it. The connectors are CSS (globals.css, "Prompt
// flow tree") and purely decorative: the structure is an ordered list of rows,
// and each card says which steps it uses, so screen readers get the same
// information without the lines.

import { useState } from "react";
import { tpl } from "@/components/analyzer/format";
import { claudeModelName, joinIds } from "@/lib/flow/markdown";
import type { FlowPlan, FlowStep } from "@/lib/flow/types";
import type { FlowDict } from "@/lib/uiDict";
import { PUNCT, type Lang } from "@/lib/domain";

type Props = {
  plan: FlowPlan;
  dict: FlowDict;
  lang: Lang;
  done: ReadonlySet<number>;
  onToggleDone: (id: number) => void;
  onCopyStep: (step: FlowStep) => Promise<boolean>;
  onImproveStep: (step: FlowStep) => void;
  onCopyAll: () => Promise<boolean>;
  onEditTask: () => void;
  onNewTask: () => void;
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.2 4.2L19 7" />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="5" r="2.2" />
      <circle cx="6" cy="19" r="2.2" />
      <circle cx="18" cy="12" r="2.2" />
      <path d="M6 7.2v9.6M6 12h4.5a3 3 0 0 0 3-3V9.4M8.2 12H15.8" />
    </svg>
  );
}

function StepCard({
  step,
  plan,
  dict,
  lang,
  parallel,
  done,
  onToggleDone,
  onCopyStep,
  onImproveStep,
}: {
  step: FlowStep;
  plan: FlowPlan;
  dict: FlowDict;
  lang: Lang;
  parallel: boolean;
  done: boolean;
  onToggleDone: (id: number) => void;
  onCopyStep: (step: FlowStep) => Promise<boolean>;
  onImproveStep: (step: FlowStep) => void;
}) {
  const [copied, setCopied] = useState(false);
  const colon = PUNCT[lang].colon;
  const stepName = (n: number) => tpl(dict.stepLabel, { n });
  const headingId = `flow-step-${step.id}`;

  async function copy() {
    const ok = await onCopyStep(step);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <article aria-labelledby={headingId} className="flow-node surface-soft flex h-full flex-col p-4" data-done={done ? "true" : undefined}>
      <header className="flex items-start gap-3">
        <span className="flow-node-num" aria-hidden="true">
          {done ? <CheckIcon /> : step.id}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            {stepName(step.id)}
            {parallel ? <span className="ml-2 normal-case tracking-normal text-accent-ink">· {dict.parallelTag}</span> : null}
          </p>
          <h3 id={headingId} className="mt-0.5 font-title text-base font-semibold leading-snug">
            {step.title}
          </h3>
        </div>
      </header>

      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.goal}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="badge badge-accent" title={step.route.reason || undefined}>
          {dict.bestAi}
          {colon}
          {step.route.productLabel}
        </span>
        {step.dependsOn.length > 0 ? (
          <span className="badge badge-neutral">{tpl(dict.usesLabel, { steps: joinIds(step.dependsOn, plan.lang, dict.and, stepName) })}</span>
        ) : null}
      </div>
      {step.route.reason ? <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-faint">{step.route.reason}</p> : null}

      <details className="flow-prompt mt-3">
        <summary className="cursor-pointer select-none text-xs font-medium text-ink-muted">{dict.showPrompt}</summary>
        <pre className="prompt-block mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-line bg-surface-raised p-3">
          {step.prompt}
        </pre>
      </details>

      <p className="mt-3 text-xs text-ink-muted">
        <span className="font-medium text-ink">{dict.outputLabel}</span>
        {colon}
        {step.output}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        <button type="button" onClick={copy} className="btn btn-ghost h-8 px-3 text-xs" aria-describedby={headingId}>
          <span aria-live="polite">{copied ? dict.copied : dict.copyPrompt}</span>
        </button>
        <button type="button" onClick={() => onImproveStep(step)} className="btn btn-ghost h-8 px-3 text-xs" aria-describedby={headingId}>
          {dict.improveStep}
        </button>
        <label className="ml-auto inline-flex cursor-pointer select-none items-center gap-1.5 text-xs text-ink-muted">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--accent)]"
            checked={done}
            onChange={() => onToggleDone(step.id)}
            aria-label={tpl(dict.doneAria, { n: step.id })}
          />
          {dict.markDone}
        </label>
      </div>
    </article>
  );
}

export default function FlowTree(props: Props) {
  const { plan, dict, lang, done } = props;
  const [copiedAll, setCopiedAll] = useState(false);
  const parallelIds = new Set(plan.levels.filter((row) => row.length > 1).flat());
  const parallelCount = parallelIds.size;
  const doneCount = plan.steps.filter((s) => done.has(s.id)).length;
  const total = plan.steps.length;
  const byId = new Map(plan.steps.map((s) => [s.id, s]));
  let order = 0;

  async function copyAll() {
    if (!(await props.onCopyAll())) return;
    setCopiedAll(true);
    window.setTimeout(() => setCopiedAll(false), 1800);
  }

  return (
    <section aria-label={dict.treeAria} className="flow-tree">
      {/* Root: the main task */}
      <div className="flow-root surface mx-auto max-w-3xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            <BranchIcon />
            {dict.rootLabel}
          </span>
          <span className={["badge", plan.source === "ai" ? "badge-accent" : "badge-neutral"].join(" ")}>
            {plan.source === "ai" ? tpl(dict.sourceAi, { model: claudeModelName(plan.model) }) : dict.sourceBasic}
          </span>
          <span className="badge badge-neutral">{tpl(dict.stepsCount, { n: total })}</span>
          {parallelCount > 0 ? <span className="badge badge-neutral">{tpl(dict.parallelCount, { n: parallelCount })}</span> : null}
        </div>

        <p className="mt-3 line-clamp-6 whitespace-pre-wrap break-words font-title text-lg font-semibold leading-snug">{plan.task}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{plan.summary}</p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span aria-live="polite">{tpl(dict.progress, { done: doneCount, total })}</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-soft" aria-hidden="true">
            <div className="flow-progress h-full rounded-full bg-accent" style={{ width: `${total ? Math.round((doneCount / total) * 100) : 0}%` }} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={copyAll} className="btn btn-primary h-9 px-4 text-sm">
            <span aria-live="polite">{copiedAll ? dict.copied : dict.copyAll}</span>
          </button>
          <button type="button" onClick={props.onEditTask} className="btn btn-ghost h-9 px-4 text-sm">
            {dict.editTask}
          </button>
          <button type="button" onClick={props.onNewTask} className="btn btn-ghost h-9 px-4 text-sm">
            {dict.newTask}
          </button>
        </div>
      </div>

      {/* Levels, top to bottom */}
      <ol className="flow-levels">
        {plan.levels.map((row, levelIndex) => {
          const cols = Math.min(row.length, 3);
          const joins = row.length > 1 && levelIndex < plan.levels.length - 1;
          return (
            <li key={levelIndex} className="flow-level">
              <ul
                className="flow-row"
                data-parallel={row.length > 1 ? "true" : undefined}
                data-joins={joins ? "true" : undefined}
                style={{ ["--flow-cols" as string]: cols }}
              >
                {row.map((id) => {
                  const step = byId.get(id);
                  if (!step) return null;
                  const i = order++;
                  return (
                    <li key={id} className="flow-node-wrap" style={{ ["--flow-i" as string]: i }}>
                      <StepCard
                        step={step}
                        plan={plan}
                        dict={dict}
                        lang={lang}
                        parallel={parallelIds.has(id)}
                        done={done.has(id)}
                        onToggleDone={props.onToggleDone}
                        onCopyStep={props.onCopyStep}
                        onImproveStep={props.onImproveStep}
                      />
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
