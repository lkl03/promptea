"use client";

// components/agentReady/FindingsBoard.tsx
//
// v1.9.0 — findings on one side, the fix plan on the other. A finding is
// dragged into the plan, the plan is reordered by dragging, and a card dragged
// back out leaves it. The plan's order is the order the person's coding agent
// follows (the MCP server's list_fixes).
//
// Drag and drop is @dnd-kit: pointer, touch and keyboard (focus a handle,
// Space to pick up, arrows to move, Space to drop, Escape to cancel) with
// spoken announcements. Every move also has a plain button on the card, so
// nothing depends on dragging.

import { useId, useMemo, useState } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners, useDroppable, useSensor, useSensors,
  type Announcements, type DragEndEvent, type DragOverEvent, type DragStartEvent, type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { CHECK_EFFORT } from "@/lib/agentReady/weights";
import type { Audit, CheckId, CheckResult } from "@/lib/agentReady/types";
import type { AgentReadyDict } from "@/lib/uiDict";
import { fmt, openChecks, unplanned, type SessionState } from "./shared";

const PLAN = "lane:plan";
const FINDINGS = "lane:findings";

type CardProps = {
  check: CheckResult;
  dict: AgentReadyDict;
  inPlan: boolean;
  index: number;
  total: number;
  done: boolean;
  canMark: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onToggleDone: () => void;
};

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <circle cx="5.5" cy="3.5" r="1.3" />
      <circle cx="10.5" cy="3.5" r="1.3" />
      <circle cx="5.5" cy="8" r="1.3" />
      <circle cx="10.5" cy="8" r="1.3" />
      <circle cx="5.5" cy="12.5" r="1.3" />
      <circle cx="10.5" cy="12.5" r="1.3" />
    </svg>
  );
}

function CardBody({ check, dict, inPlan, index, total, done, canMark, onAdd, onRemove, onMove, onToggleDone, handle }: CardProps & { handle: React.ReactNode }) {
  const b = dict.board;
  const copy = dict.checks[check.id];
  const gain = check.weight - check.points;
  return (
    <div className="flex items-start gap-2">
      {handle}
      {inPlan ? <span className="ar-plan-num mt-0.5">{done ? "✓" : index + 1}</span> : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h4 className="min-w-0 text-sm font-semibold">{copy.title}</h4>
          <span className={`badge ${check.status === "fail" ? "badge-danger" : "badge-warning"}`}>{dict.status[check.status]}</span>
          <span className="badge badge-accent">{fmt(b.points, { n: gain % 1 === 0 ? gain : gain.toFixed(1) })}</span>
          <span className="badge badge-neutral">
            {b.effortLabel}: {b.effort[CHECK_EFFORT[check.id]]}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{copy.body}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {inPlan ? (
            <>
              <button type="button" className="pill h-7 px-2.5" onClick={() => onMove(-1)} disabled={index === 0}>
                {b.up}
              </button>
              <button type="button" className="pill h-7 px-2.5" onClick={() => onMove(1)} disabled={index === total - 1}>
                {b.down}
              </button>
              <button type="button" className="pill h-7 px-2.5" onClick={onRemove}>
                {b.remove}
              </button>
            </>
          ) : (
            <button type="button" className="pill h-7 px-2.5" onClick={onAdd}>
              {b.add}
            </button>
          )}
          {canMark ? (
            <button type="button" className="pill h-7 px-2.5" aria-pressed={done} onClick={onToggleDone}>
              {done ? b.done : b.markDone}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SortableCard(props: CardProps) {
  const { check, dict, done } = props;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: check.id });
  return (
    <li
      ref={setNodeRef}
      className="ar-card"
      data-status={check.status}
      data-done={done}
      data-dragging={isDragging}
      data-settled={transform ? "true" : undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // The whole card can be dragged with a pointer; the keyboard uses the handle, so the buttons inside keep Space and Enter.
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button, a, summary")) return;
        (listeners?.onPointerDown as ((ev: React.PointerEvent) => void) | undefined)?.(e);
      }}
    >
      <CardBody
        {...props}
        handle={
          <button type="button" ref={setActivatorNodeRef} className="ar-handle" aria-label={fmt(dict.board.handle, { title: dict.checks[check.id].title })} {...attributes} {...listeners}>
            <GripIcon />
          </button>
        }
      />
    </li>
  );
}

function Lane({ id, title, count, hint, children, action }: { id: string; title: string; count: number; hint?: string; children: React.ReactNode; action?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const headingId = useId();
  return (
    <section ref={setNodeRef} className="ar-lane" data-over={isOver} aria-labelledby={headingId}>
      <div className="mb-2 flex min-h-8 items-center justify-between gap-2 px-1">
        <h3 id={headingId} className="text-sm font-semibold">
          {title} <span className="font-normal text-ink-faint tabular-nums">({count})</span>
        </h3>
        {action}
      </div>
      {children}
      {hint ? <p className="px-1 pt-2 text-xs text-ink-faint">{hint}</p> : null}
    </section>
  );
}

type Props = {
  dict: AgentReadyDict;
  audit: Audit;
  state: SessionState;
  /** False when the audit was not saved: progress cannot be recorded. */
  canMark: boolean;
  onPlanChange: (plan: CheckId[]) => void;
  onToggleDone: (id: CheckId, done: boolean) => void;
};

export default function FindingsBoard({ dict, audit, state, canMark, onPlanChange, onToggleDone }: Props) {
  const b = dict.board;
  const dndId = useId();
  const open = useMemo(() => openChecks(audit), [audit]);
  const byId = useMemo(() => new Map(open.map((c) => [c.id, c])), [open]);
  // While a card is in the air the plan is previewed locally; it is committed on drop.
  const [draft, setDraft] = useState<CheckId[] | null>(null);
  const [active, setActive] = useState<CheckId | null>(null);

  const plan = (draft ?? state.plan).filter((id) => byId.has(id));
  const findings = unplanned(audit, plan);
  const passed = audit.checks.filter((c) => c.status === "pass");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const title = (id: UniqueIdentifier) => dict.checks[id as CheckId]?.title ?? "";
  const laneOf = (id: UniqueIdentifier | undefined, current: CheckId[]): "plan" | "findings" | null => {
    if (id === undefined) return null;
    if (id === PLAN) return "plan";
    if (id === FINDINGS) return "findings";
    return current.includes(id as CheckId) ? "plan" : byId.has(id as CheckId) ? "findings" : null;
  };

  const commit = (next: CheckId[]) => {
    setDraft(null);
    if (next.join() !== state.plan.join()) onPlanChange(next);
  };

  const onDragStart = (e: DragStartEvent) => {
    setActive(e.active.id as CheckId);
    setDraft(plan);
  };

  const onDragOver = (e: DragOverEvent) => {
    const id = e.active.id as CheckId;
    const current = draft ?? plan;
    const to = laneOf(e.over?.id, current);
    const from = current.includes(id) ? "plan" : "findings";
    if (!to || to === from) return;
    if (to === "plan") {
      const at = e.over && e.over.id !== PLAN ? current.indexOf(e.over.id as CheckId) : -1;
      const next = [...current];
      next.splice(at === -1 ? next.length : at, 0, id);
      setDraft(next);
    } else {
      setDraft(current.filter((x) => x !== id));
    }
  };

  /** The plan as it will be once the card in the air is dropped where it is. */
  const settled = (activeId: UniqueIdentifier, overId: UniqueIdentifier | undefined): CheckId[] => {
    const id = activeId as CheckId;
    const next = draft ?? plan;
    if (overId !== undefined && overId !== PLAN && next.includes(id) && next.includes(overId as CheckId)) {
      return arrayMove(next, next.indexOf(id), next.indexOf(overId as CheckId));
    }
    return next;
  };

  const onDragEnd = (e: DragEndEvent) => {
    const next = settled(e.active.id, e.over?.id);
    setActive(null);
    commit(next);
  };

  const announcements: Announcements = {
    onDragStart: ({ active: a }) => fmt(b.announce.picked, { title: title(a.id) }),
    onDragOver: ({ active: a, over }) => {
      const current = draft ?? plan;
      const lane = laneOf(over?.id, current);
      if (lane === "plan") {
        const next = settled(a.id, over?.id);
        return fmt(b.announce.movedPlan, { title: title(a.id), n: Math.max(1, next.indexOf(a.id as CheckId) + 1), total: Math.max(1, next.length) });
      }
      if (lane === "findings") return fmt(b.announce.overFindings, { title: title(a.id) });
      return undefined;
    },
    onDragEnd: ({ active: a, over }) => {
      const n = settled(a.id, over?.id).indexOf(a.id as CheckId);
      return n === -1 ? fmt(b.announce.removed, { title: title(a.id) }) : fmt(b.announce.added, { title: title(a.id), n: n + 1 });
    },
    onDragCancel: () => b.announce.cancelled,
  };

  const cardProps = (check: CheckResult, inPlan: boolean, index: number): CardProps => ({
    check,
    dict,
    inPlan,
    index,
    total: plan.length,
    done: state.progress[check.id]?.done === true,
    canMark,
    onAdd: () => commit([...plan, check.id]),
    onRemove: () => commit(plan.filter((x) => x !== check.id)),
    onMove: (dir) => commit(arrayMove(plan, index, Math.min(plan.length - 1, Math.max(0, index + dir)))),
    onToggleDone: () => onToggleDone(check.id, !(state.progress[check.id]?.done === true)),
  });

  const activeCheck = active ? byId.get(active) : undefined;

  return (
    <section className="surface ar-reveal p-4 sm:p-6" style={{ ["--i" as string]: 2 }} aria-labelledby={`${dndId}-title`}>
      <h2 id={`${dndId}-title`} className="font-title text-xl font-semibold">
        {b.title}
      </h2>

      {open.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{b.allPassed}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-muted">{b.hint}</p>
          <p className="sr-only">{b.keyboardHint}</p>
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={() => {
              setActive(null);
              setDraft(null);
            }}
            accessibility={{ announcements, screenReaderInstructions: { draggable: b.keyboardHint } }}
          >
            <div className="ar-board mt-4">
              <Lane
                id={FINDINGS}
                title={b.findings}
                count={findings.length}
                action={
                  findings.length > 1 ? (
                    <button type="button" className="pill h-7 px-2.5" onClick={() => commit([...plan, ...findings.map((c) => c.id)])}>
                      {b.addAll}
                    </button>
                  ) : null
                }
              >
                <SortableContext items={findings.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  <ul className="ar-lane-list">
                    {findings.map((c) => (
                      <SortableCard key={c.id} {...cardProps(c, false, 0)} />
                    ))}
                    {findings.length === 0 ? <li className="grid min-h-20 place-items-center px-3 text-center text-xs text-ink-faint">{b.findingsEmpty}</li> : null}
                  </ul>
                </SortableContext>
              </Lane>

              <Lane id={PLAN} title={b.plan} count={plan.length}>
                <SortableContext items={plan} strategy={verticalListSortingStrategy}>
                  <ol className="ar-lane-list">
                    {plan.map((id, i) => (
                      <SortableCard key={id} {...cardProps(byId.get(id)!, true, i)} />
                    ))}
                    {plan.length === 0 ? <li className="grid min-h-20 place-items-center rounded-xl border border-dashed border-line-strong px-3 text-center text-xs text-ink-faint">{b.planEmpty}</li> : null}
                  </ol>
                </SortableContext>
              </Lane>
            </div>

            <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
              {activeCheck ? (
                <div className="ar-card" data-overlay="true" data-status={activeCheck.status}>
                  <CardBody
                    {...cardProps(activeCheck, plan.includes(activeCheck.id), Math.max(0, plan.indexOf(activeCheck.id)))}
                    handle={
                      <span className="ar-handle" aria-hidden="true">
                        <GripIcon />
                      </span>
                    }
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      )}

      {passed.length > 0 ? (
        <details className="mt-5 text-sm">
          <summary className="cursor-pointer font-medium text-ink-muted">{fmt(b.passed, { n: passed.length })}</summary>
          <ul className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0">
            {passed.map((c) => (
              <li key={c.id} className="badge badge-success">
                ✓ {dict.checks[c.id].title}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
