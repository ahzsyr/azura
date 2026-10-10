"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SectionEditorProps } from "../types";

/** Same control as the CMS spacer block: a pixel height. */
export function SpacerEditor({ column, onUpdate }: SectionEditorProps) {
  return (
    <div className="space-y-1.5">
      <Label>Height (px)</Label>
      <Input
        type="number"
        min={0}
        placeholder="Height (px)"
        value={String(column.height ?? 48)}
        onChange={(event) => onUpdate({ height: Math.max(0, Number(event.target.value) || 0) })}
      />
    </div>
  );
}
