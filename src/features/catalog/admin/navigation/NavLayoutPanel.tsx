"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  CatalogNavigationBreakpointLayout,
  CatalogNavigationDisplayMode,
  CatalogNavigationHorizontalAlign,
  CatalogNavigationIconContainerStyle,
  CatalogNavigationIconPosition,
  CatalogNavigationLayout,
} from "@/features/catalog/navigation/types";
import {
  GAP_PRESETS,
  ITEM_PADDING_PRESETS,
} from "@/features/catalog/navigation/layout-semantics";
import {
  applyLayoutQuickPreset,
  defaultCatalogNavigationLayout,
  layoutPatchForDensity,
  layoutPatchForSize,
  matchLayoutDensity,
  matchLayoutQuickPreset,
  matchLayoutSize,
  type LayoutDensityId,
  type LayoutQuickPresetId,
  type LayoutSizeId,
} from "./nav-style-presets";

type LayoutBreakpoint = "base" | "desktop" | "tablet" | "mobile";

const QUICK_PRESETS: Array<{ id: LayoutQuickPresetId; label: string; hint: string }> = [
  { id: "icon-text-standard", label: "Icon + Text", hint: "Standard strip" },
  { id: "icon-only-compact", label: "Icon only", hint: "Compact + scroll" },
  { id: "text-only", label: "Text only", hint: "Labels without icons" },
  { id: "categories-equal", label: "Equal width", hint: "Categories share space" },
];

const DISPLAY_MODES: Array<{ id: CatalogNavigationDisplayMode; label: string }> = [
  { id: "icon-text", label: "Icon + Text" },
  { id: "icon", label: "Icon only" },
  { id: "text", label: "Text only" },
  { id: "auto", label: "Auto" },
];

const ICON_POSITIONS: Array<{ id: CatalogNavigationIconPosition; label: string }> = [
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
];

const DENSITY_OPTIONS: Array<{ id: LayoutDensityId; label: string }> = [
  { id: "tight", label: "Tight" },
  { id: "normal", label: "Normal" },
  { id: "relaxed", label: "Relaxed" },
];

const SIZE_OPTIONS: Array<{ id: LayoutSizeId; label: string }> = [
  { id: "compact", label: "Compact" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
];

const ALIGN_X: Array<{ id: CatalogNavigationHorizontalAlign; label: string }> = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
  { id: "space-between", label: "Between" },
];

const ICON_BOX_STYLES: Array<{ id: CatalogNavigationIconContainerStyle; label: string }> = [
  { id: "none", label: "None" },
  { id: "circle", label: "Circle" },
  { id: "rounded", label: "Rounded" },
  { id: "square", label: "Square" },
];

const PADDING_OPTIONS = [
  { id: "none", label: "None", value: ITEM_PADDING_PRESETS.none },
  { id: "compact", label: "Compact", value: ITEM_PADDING_PRESETS.compact },
  { id: "comfortable", label: "Comfortable", value: ITEM_PADDING_PRESETS.comfortable },
  { id: "spacious", label: "Spacious", value: ITEM_PADDING_PRESETS.spacious },
] as const;

const selectedClass =
  "border-primary bg-primary text-primary-foreground shadow-sm font-medium";
const idleClass = "border-border bg-background hover:bg-muted/50";

function Segmented<T extends string>({
  value,
  options,
  onChange,
  columns = 4,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (id: T) => void;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div
      className={cn(
        "grid gap-1.5",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-2 sm:grid-cols-4",
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          aria-pressed={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            "rounded-md border px-2.5 py-1.5 text-sm transition-colors",
            value === opt.id ? selectedClass : idleClass,
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function parsePxNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function matchPaddingId(value?: string): (typeof PADDING_OPTIONS)[number]["id"] | "custom" {
  if (!value) return "comfortable";
  const hit = PADDING_OPTIONS.find((opt) => opt.value === value);
  return hit?.id ?? "custom";
}

export function NavLayoutPanel({
  breakpoint,
  onBreakpointChange,
  layout,
  onPatchLayout,
  onReplaceLayout,
}: {
  breakpoint: LayoutBreakpoint;
  onBreakpointChange: (bp: LayoutBreakpoint) => void;
  layout: CatalogNavigationLayout | CatalogNavigationBreakpointLayout;
  onPatchLayout: (patch: Partial<CatalogNavigationBreakpointLayout>) => void;
  onReplaceLayout: (next: CatalogNavigationBreakpointLayout) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const displayMode = layout.displayMode ?? "auto";
  const showIconPosition = displayMode === "icon-text" || displayMode === "auto";
  const isIconOnly = displayMode === "icon";
  const forMobile = breakpoint === "mobile";
  const density = matchLayoutDensity(layout);
  const size = matchLayoutSize(layout);
  const activeQuick = matchLayoutQuickPreset(layout);
  const paddingId = matchPaddingId(layout.itemPadding);

  const applyQuick = (id: LayoutQuickPresetId) => {
    onReplaceLayout(applyLayoutQuickPreset(id, { forMobile }));
  };

  const restoreDefaults = () => {
    onReplaceLayout(defaultCatalogNavigationLayout({ forMobile }));
  };

  const setString = (key: keyof CatalogNavigationLayout, value: string) => {
    onPatchLayout({ [key]: value.trim() ? value : undefined });
  };

  const itemWidthMode =
    !layout.itemWidth || layout.itemWidth === "auto"
      ? "auto"
      : layout.itemWidth === "equal"
        ? "equal"
        : layout.itemWidth === "full"
          ? "full"
          : "fixed";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <section className="space-y-2">
          <Label className="text-xs font-medium">Responsive</Label>
          <div className="flex flex-wrap gap-1.5">
            {(["base", "desktop", "tablet", "mobile"] as const).map((bp) => (
              <Button
                key={bp}
                type="button"
                size="sm"
                variant={breakpoint === bp ? "default" : "outline"}
                onClick={() => onBreakpointChange(bp)}
              >
                {bp === "base" ? "Default" : bp[0]!.toUpperCase() + bp.slice(1)}
              </Button>
            ))}
          </div>
        </section>
        <Button type="button" size="sm" variant="outline" onClick={restoreDefaults}>
          Restore defaults
        </Button>
      </div>

      {breakpoint === "mobile" ? (
        <p className="text-xs text-muted-foreground">
          Tip: Icon-only + horizontal scroll works well on mobile.
        </p>
      ) : null}

      <section className="space-y-2">
        <div>
          <Label className="text-xs font-medium">Apply a layout</Label>
          <p className="text-xs text-muted-foreground">
            One click sets display, spacing, and scroll for this breakpoint.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {QUICK_PRESETS.map((preset) => {
            const selected = activeQuick === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selected}
                onClick={() => applyQuick(preset.id)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  selected ? selectedClass : idleClass,
                )}
              >
                <div className="text-sm font-medium">{preset.label}</div>
                <div
                  className={cn(
                    "text-xs",
                    selected ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {preset.hint}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
        <Label className="text-xs font-medium">Fine-tune</Label>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Display</Label>
          <Segmented
            value={displayMode}
            options={DISPLAY_MODES}
            onChange={(mode) =>
              onPatchLayout({
                displayMode: mode,
                showIcons: mode === "text" ? false : mode === "icon" ? true : undefined,
              })
            }
          />
        </div>

        {showIconPosition ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Icon position</Label>
            <Segmented
              value={layout.iconPosition ?? "top"}
              options={ICON_POSITIONS}
              onChange={(iconPosition) => onPatchLayout({ iconPosition })}
            />
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Density</Label>
            <Segmented
              value={density === "custom" ? "normal" : density}
              options={DENSITY_OPTIONS}
              columns={3}
              onChange={(id) => onPatchLayout(layoutPatchForDensity(id))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Size</Label>
            <Segmented
              value={size === "custom" ? "medium" : size}
              options={SIZE_OPTIONS}
              columns={3}
              onChange={(id) => onPatchLayout(layoutPatchForSize(id))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Button padding</Label>
          <Segmented
            value={paddingId === "custom" ? "comfortable" : paddingId}
            options={PADDING_OPTIONS.map((opt) => ({ id: opt.id, label: opt.label }))}
            onChange={(id) => {
              const opt = PADDING_OPTIONS.find((p) => p.id === id);
              if (opt) onPatchLayout({ itemPadding: opt.value });
            }}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Space between buttons ({parsePxNumber(layout.gap, 8)}px)
            </Label>
            <input
              type="range"
              min={0}
              max={32}
              value={parsePxNumber(layout.gap, 8)}
              onChange={(e) => onPatchLayout({ gap: `${e.target.value}px` })}
              className="w-full"
            />
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(GAP_PRESETS).map(([id, value]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={layout.gap === value}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs capitalize transition-colors",
                    layout.gap === value ? selectedClass : idleClass,
                  )}
                  onClick={() => onPatchLayout({ gap: value })}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Button margin ({parsePxNumber(layout.itemMargin, 0)}px)
            </Label>
            <input
              type="range"
              min={0}
              max={24}
              value={parsePxNumber(layout.itemMargin, 0)}
              onChange={(e) => onPatchLayout({ itemMargin: `${e.target.value}px` })}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Icon–label gap ({parsePxNumber(layout.iconLabelGap, 8)}px)
            </Label>
            <input
              type="range"
              min={0}
              max={24}
              value={parsePxNumber(layout.iconLabelGap, 8)}
              onChange={(e) => onPatchLayout({ iconLabelGap: `${e.target.value}px` })}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Strip pad X</Label>
              <Input
                type="number"
                min={0}
                value={parsePxNumber(layout.paddingX, 8)}
                onChange={(e) => setString("paddingX", `${e.target.value}px`)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Strip pad Y</Label>
              <Input
                type="number"
                min={0}
                value={parsePxNumber(layout.paddingY, 8)}
                onChange={(e) => setString("paddingY", `${e.target.value}px`)}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Item width</Label>
            <Segmented
              value={itemWidthMode === "fixed" ? "auto" : itemWidthMode}
              options={[
                { id: "auto" as const, label: "Auto" },
                { id: "equal" as const, label: "Equal" },
                { id: "full" as const, label: "Full" },
              ]}
              columns={3}
              onChange={(id) => onPatchLayout({ itemWidth: id })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Align</Label>
            <Segmented
              value={layout.horizontalAlignment ?? "start"}
              options={ALIGN_X}
              onChange={(horizontalAlignment) => onPatchLayout({ horizontalAlignment })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Overflow</Label>
          <Segmented
            value={layout.horizontalScroll === false ? "off" : "on"}
            options={[
              { id: "on" as const, label: "Scroll" },
              { id: "off" as const, label: "Clip" },
            ]}
            columns={2}
            onChange={(id) => onPatchLayout({ horizontalScroll: id === "on" })}
          />
        </div>
      </section>

      <section className="space-y-2">
        <button
          type="button"
          className="text-sm font-medium text-foreground"
          onClick={() => setMoreOpen((v) => !v)}
        >
          More options {moreOpen ? "▴" : "▾"}
        </button>
        {moreOpen ? (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Container width</Label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["full", "Full", { containerWidth: "100%", containerMaxWidth: undefined }],
                    ["content", "Content", { containerWidth: "auto", containerMaxWidth: "1200px" }],
                    ["fixed", "Fixed", { containerWidth: "960px", containerMaxWidth: "960px" }],
                  ] as const
                ).map(([id, label, patch]) => {
                  const selected =
                    (id === "full" &&
                      (layout.containerWidth === "100%" || !layout.containerWidth)) ||
                    (id === "content" && layout.containerMaxWidth === "1200px") ||
                    (id === "fixed" && layout.containerWidth === "960px");
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selected}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-sm transition-colors",
                        selected ? selectedClass : idleClass,
                      )}
                      onClick={() => onPatchLayout({ ...patch })}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Icon container</Label>
              <Segmented
                value={layout.iconContainerStyle ?? "none"}
                options={ICON_BOX_STYLES}
                onChange={(iconContainerStyle) => onPatchLayout({ iconContainerStyle })}
              />
            </div>

            {isIconOnly ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={layout.showTooltip !== false}
                  onChange={(e) => onPatchLayout({ showTooltip: e.target.checked })}
                />
                Show tooltip on hover (uses item label)
              </label>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-2 border-t border-border pt-4">
        <button
          type="button"
          className="text-sm font-medium text-foreground"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          Advanced CSS {advancedOpen ? "▴" : "▾"}
        </button>
        {advancedOpen ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["containerWidth", "Container width"],
                ["containerHeight", "Container height"],
                ["containerMaxWidth", "Max width"],
                ["containerMinHeight", "Min height"],
                ["paddingX", "Padding X"],
                ["paddingY", "Padding Y"],
                ["gap", "Gap"],
                ["itemWidth", "Item width"],
                ["itemHeight", "Item height"],
                ["itemPadding", "Item padding"],
                ["itemMargin", "Item margin"],
                ["iconSize", "Icon size"],
                ["iconContainerSize", "Icon container"],
                ["labelSize", "Label size"],
                ["iconLabelGap", "Icon–label gap"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  value={(layout[key] as string | undefined) ?? ""}
                  placeholder="CSS value"
                  onChange={(e) => setString(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
