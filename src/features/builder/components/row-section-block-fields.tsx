"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { rowSectionColumnLayoutsForMax } from "@/features/builder/container-blocks";

type Props = {
  block: BlockNode;
  setProp: (key: string, value: unknown) => void;
};

const LAYOUT_LABELS: Record<string, string> = {
  equal: "Equal columns",
  "wide-left": "Wide left",
  "wide-right": "Wide right",
  "equal-thirds": "Equal thirds",
  "equal-quarters": "Equal quarters",
};

export function RowSectionBlockFields({ block, setProp }: Props) {
  const maxColumns = (block.props.maxColumns as number) ?? 2;
  const layoutOptions = rowSectionColumnLayoutsForMax(maxColumns);
  const currentLayout = (block.props.columnLayout as string) ?? "equal";
  const layoutValue = layoutOptions.includes(currentLayout) ? currentLayout : layoutOptions[0];

  const handleMaxColumns = (value: number) => {
    setProp("maxColumns", value);
    const nextLayouts = rowSectionColumnLayoutsForMax(value);
    if (!nextLayouts.includes(currentLayout)) {
      setProp("columnLayout", nextLayouts[0]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Padding</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.padding as string) ?? "default"}
            onChange={(e) => setProp("padding", e.target.value)}
          >
            <option value="none">None</option>
            <option value="default">Default</option>
            <option value="large">Large</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Background</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.background as string) ?? "default"}
            onChange={(e) => setProp("background", e.target.value)}
          >
            <option value="default">Default</option>
            <option value="muted">Muted</option>
            <option value="primary">Primary tint</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Max columns</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={String(maxColumns)}
            onChange={(e) => handleMaxColumns(Number(e.target.value))}
          >
            <option value="2">2 columns</option>
            <option value="3">3 columns</option>
            <option value="4">4 columns</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Column layout</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={layoutValue}
            onChange={(e) => setProp("columnLayout", e.target.value)}
          >
            {layoutOptions.map((layout) => (
              <option key={layout} value={layout}>
                {LAYOUT_LABELS[layout] ?? layout}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Gap</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.gap as string) ?? "md"}
            onChange={(e) => setProp("gap", e.target.value)}
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Vertical align</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={(block.props.verticalAlign as string) ?? "stretch"}
            onChange={(e) => setProp("verticalAlign", e.target.value)}
          >
            <option value="start">Top</option>
            <option value="center">Center</option>
            <option value="stretch">Stretch</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={(block.props.stackOnMobile as boolean) ?? true}
          onChange={(e) => setProp("stackOnMobile", e.target.checked)}
        />
        Stack columns on mobile
      </label>
      <p className="text-xs text-muted-foreground">
        Add nested blocks in each column below. Up to {maxColumns} blocks display side-by-side.
      </p>
    </div>
  );
}
