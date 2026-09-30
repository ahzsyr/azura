"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import type { ImageContentPosition } from "@/features/builder/blocks/content/lib/image-block-model";

const GRID: ImageContentPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

const GRID_LABELS: Record<ImageContentPosition, string> = {
  "top-left": "↖",
  "top-center": "↑",
  "top-right": "↗",
  "center-left": "←",
  center: "•",
  "center-right": "→",
  "bottom-left": "↙",
  "bottom-center": "↓",
  "bottom-right": "↘",
};

type Props = {
  value: ImageContentPosition;
  onChange: (value: ImageContentPosition) => void;
};

export function ContentPositionGrid({ value, onChange }: Props) {
  return (
    <div>
      <Label className="text-xs">Content position</Label>
      <div className="mt-1 grid w-36 grid-cols-3 gap-1">
        {GRID.map((pos) => (
          <button
            key={pos}
            type="button"
            title={pos}
            className={cn(
              "flex h-9 items-center justify-center rounded-md border text-sm transition-colors",
              value === pos ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
            )}
            onClick={() => onChange(pos)}
          >
            {GRID_LABELS[pos]}
          </button>
        ))}
      </div>
    </div>
  );
}
