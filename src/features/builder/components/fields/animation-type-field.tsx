"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AnimationType, BlockAnimationPhase } from "@/types/block-system";

const ANIMATION_TYPES: { value: AnimationType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "zoom", label: "Zoom" },
  { value: "rotate", label: "Rotate" },
  { value: "scale", label: "Scale" },
  { value: "bounce", label: "Bounce" },
];

const EASING_OPTIONS = [
  { value: "ease", label: "Ease" },
  { value: "ease-in", label: "Ease in" },
  { value: "ease-out", label: "Ease out" },
  { value: "ease-in-out", label: "Ease in-out" },
  { value: "cubic-bezier(0.22, 1, 0.36, 1)", label: "Smooth" },
];

type AnimationTypeFieldProps = {
  label?: string;
  phase: BlockAnimationPhase | undefined;
  onChange: (phase: BlockAnimationPhase) => void;
};

export function AnimationTypeField({
  label = "Animation",
  phase,
  onChange,
}: AnimationTypeFieldProps) {
  const p = phase ?? {};

  const patch = (partial: Partial<BlockAnimationPhase>) => {
    onChange({ ...p, ...partial });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>{label} type</Label>
        <select
          className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={p.type ?? "none"}
          onChange={(e) => patch({ type: e.target.value as AnimationType })}
        >
          {ANIMATION_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {(p.type ?? "none") !== "none" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Duration (ms)</Label>
            <Input
              type="number"
              min={0}
              step={50}
              value={p.durationMs ?? 600}
              onChange={(e) => patch({ durationMs: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label className="text-xs">Delay (ms)</Label>
            <Input
              type="number"
              min={0}
              step={50}
              value={p.delayMs ?? 0}
              onChange={(e) => patch({ delayMs: Number(e.target.value) })}
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Easing</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={p.easing ?? "ease-out"}
              onChange={(e) => patch({ easing: e.target.value })}
            >
              {EASING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
