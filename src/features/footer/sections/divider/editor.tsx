"use client";

import { Label } from "@/components/ui/label";
import type { SectionEditorProps } from "../types";

/** Same control as the CMS divider block: solid, dashed, or gold accent. */
export function DividerEditor({ column, onUpdate }: SectionEditorProps) {
  return (
    <div className="space-y-1.5">
      <Label>Style</Label>
      <select
        className="h-9 w-full rounded-md border px-2 text-sm"
        value={column.style ?? "solid"}
        onChange={(event) => onUpdate({ style: event.target.value as "solid" | "dashed" | "gold" })}
      >
        <option value="solid">Solid</option>
        <option value="dashed">Dashed</option>
        <option value="gold">Gold accent</option>
      </select>
    </div>
  );
}
