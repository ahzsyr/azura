"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Props = {
  block: BlockNode;
  setProp: (key: string, value: unknown) => void;
};

const LAYOUT_LABELS: Record<string, string> = {
  stack: "Stack (vertical)",
  splitLeft: "Split — wide left",
  splitRight: "Split — wide right",
  grid: "Grid",
  slider: "Slider / carousel",
};

export function SectionBlockFields({ block, setProp }: Props) {
  const layoutMode = (block.props.layoutMode as string) ?? "stack";
  const gap = (block.props.gap as string) ?? "md";
  const maxWidth = (block.props.maxWidth as string) ?? "full";

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
        <div className="md:col-span-2">
          <Label className="text-xs">Inner layout</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={layoutMode}
            onChange={(e) => setProp("layoutMode", e.target.value)}
          >
            {Object.entries(LAYOUT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Gap</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={gap}
            onChange={(e) => setProp("gap", e.target.value)}
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Content width</Label>
          <select
            className="w-full border rounded-md h-9 px-2 text-sm mt-1"
            value={maxWidth}
            onChange={(e) => setProp("maxWidth", e.target.value)}
          >
            <option value="full">Full width</option>
            <option value="container">Container</option>
            <option value="narrow">Narrow</option>
          </select>
        </div>
        {layoutMode === "grid" && (
          <div>
            <Label className="text-xs">Columns</Label>
            <select
              className="w-full border rounded-md h-9 px-2 text-sm mt-1"
              value={String(block.props.columns ?? 2)}
              onChange={(e) => setProp("columns", Number(e.target.value))}
            >
              <option value="2">2 columns</option>
              <option value="3">3 columns</option>
              <option value="4">4 columns</option>
            </select>
          </div>
        )}
        {layoutMode === "slider" && (
          <>
            <div>
              <Label className="text-xs">Slides per view</Label>
              <select
                className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                value={String(block.props.slidesPerView ?? 1)}
                onChange={(e) => setProp("slidesPerView", Number(e.target.value))}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(block.props.showArrows as boolean) ?? true}
                  onChange={(e) => setProp("showArrows", e.target.checked)}
                />
                Show arrows
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(block.props.showDots)}
                  onChange={(e) => setProp("showDots", e.target.checked)}
                />
                Show dots
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(block.props.loop as boolean) ?? true}
                  onChange={(e) => setProp("loop", e.target.checked)}
                />
                Loop
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(block.props.autoplay)}
                  onChange={(e) => setProp("autoplay", e.target.checked)}
                />
                Autoplay
              </label>
            </div>
            {Boolean(block.props.autoplay) && (
              <div>
                <Label className="text-xs">Autoplay interval (ms)</Label>
                <Input
                  type="number"
                  min={2000}
                  className="mt-1"
                  value={String(block.props.autoplayIntervalMs ?? 5000)}
                  onChange={(e) => setProp("autoplayIntervalMs", Number(e.target.value))}
                />
              </div>
            )}
          </>
        )}
      </div>
      {layoutMode !== "stack" && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={(block.props.stackOnMobile as boolean) ?? true}
            onChange={(e) => setProp("stackOnMobile", e.target.checked)}
          />
          Stack on mobile
        </label>
      )}
      <p className="text-xs text-muted-foreground">
        Add nested blocks inside this section below. Layout controls how child blocks are arranged.
      </p>
    </div>
  );
}
