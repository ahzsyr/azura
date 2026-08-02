"use client";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SchemaDocument, StepDefinition } from "../schema/schema-document";

type Props = {
  document: SchemaDocument;
  onChange: (document: SchemaDocument) => void;
};

function FieldChip({
  bindingId,
  label,
  stepId,
}: {
  bindingId: string;
  label: string;
  stepId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `step-field:${stepId}:${bindingId}`,
    data: { bindingId, fromStepId: stepId },
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }}
      className="text-xs px-2 py-1 rounded border bg-background cursor-grab"
      {...listeners}
      {...attributes}
    >
      {label}
    </button>
  );
}

function StepLane({
  step,
  bindings,
  onUpdateTitle,
  onRemove,
  children,
}: {
  step: StepDefinition;
  bindings: SchemaDocument["bindings"];
  onUpdateTitle: (title: string) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `step-lane:${step.id}`,
    data: { stepId: step.id },
  });
  return (
    <div
      ref={setNodeRef}
      className={`border rounded-lg p-4 space-y-3 min-w-[220px] flex-1 ${isOver ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
    >
      <div className="flex gap-2 items-center">
        <Input
          value={step.title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          placeholder="Step title"
          className="max-w-xs"
        />
        <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 min-h-[2.5rem]">{children}</div>
      <p className="text-[10px] text-muted-foreground">
        {step.bindingIds.length} field{step.bindingIds.length === 1 ? "" : "s"} · drag chips between steps
      </p>
      <div className="text-[10px] text-muted-foreground">
        Unassigned in this lane are managed by dragging from other steps or assigning below.
      </div>
      <div className="flex flex-wrap gap-1">
        {bindings
          .filter((b) => !step.bindingIds.includes(b.bindingId))
          .slice(0, 8)
          .map((b) => (
            <span key={b.bindingId} className="text-[10px] text-muted-foreground">
              {String(b.presentation.label ?? b.bindingId)}
            </span>
          ))}
      </div>
    </div>
  );
}

export function StepEditor({ document, onChange }: Props) {
  const steps = document.steps ?? [];
  const bindings = document.bindings;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const patchSteps = (next: StepDefinition[]) => {
    onChange({ ...document, steps: next.length ? next : undefined });
  };

  const addStep = () => {
    const id = `step-${Date.now()}`;
    patchSteps([...steps, { id, title: `Step ${steps.length + 1}`, bindingIds: [] }]);
  };

  const updateStep = (index: number, patch: Partial<StepDefinition>) => {
    patchSteps(steps.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const removeStep = (index: number) => {
    patchSteps(steps.filter((_, i) => i !== index));
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const data = active.data.current as { bindingId?: string; fromStepId?: string } | undefined;
    const overData = over.data.current as { stepId?: string } | undefined;
    if (!data?.bindingId || !overData?.stepId) return;
    const fromId = data.fromStepId;
    const toId = overData.stepId;
    if (fromId === toId) return;
    patchSteps(
      steps.map((s) => {
        if (s.id === fromId) {
          return { ...s, bindingIds: s.bindingIds.filter((id) => id !== data.bindingId) };
        }
        if (s.id === toId && !s.bindingIds.includes(data.bindingId!)) {
          return { ...s, bindingIds: [...s.bindingIds, data.bindingId!] };
        }
        return s;
      }),
    );
  };

  const assignUnassigned = (stepIndex: number, bindingId: string) => {
    const next = steps.map((s, i) => {
      const without = { ...s, bindingIds: s.bindingIds.filter((id) => id !== bindingId) };
      if (i === stepIndex) {
        return { ...without, bindingIds: [...without.bindingIds, bindingId] };
      }
      return without;
    });
    patchSteps(next);
  };

  const assigned = new Set(steps.flatMap((s) => s.bindingIds));
  const unassigned = bindings.filter((b) => !assigned.has(b.bindingId));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm">Multi-step flow</h3>
          <p className="text-sm text-muted-foreground">Drag fields between step lanes.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addStep}>
          Add step
        </Button>
      </div>

      {steps.length === 0 && (
        <p className="text-sm text-muted-foreground">No steps yet. Add a step to enable multi-step forms.</p>
      )}

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <StepLane
              key={step.id}
              step={step}
              bindings={bindings}
              onUpdateTitle={(title) => updateStep(index, { title })}
              onRemove={() => removeStep(index)}
            >
              {step.bindingIds.map((id) => {
                const b = bindings.find((x) => x.bindingId === id);
                return (
                  <FieldChip
                    key={id}
                    bindingId={id}
                    stepId={step.id}
                    label={String(b?.presentation.label ?? id)}
                  />
                );
              })}
            </StepLane>
          ))}
        </div>
      </DndContext>

      {unassigned.length > 0 && steps.length > 0 && (
        <div className="border rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium">Unassigned fields</p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((b) => (
              <div key={b.bindingId} className="flex items-center gap-1">
                <span className="text-xs border rounded px-2 py-1">
                  {String(b.presentation.label ?? b.bindingId)}
                </span>
                {steps.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    className="text-[10px] text-primary hover:underline"
                    onClick={() => assignUnassigned(i, b.bindingId)}
                  >
                    → {s.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
