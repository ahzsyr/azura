"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PRODUCT_PAGE_LAYOUT_PRESETS } from "../product-page-layout-presets";
import type { ProductPageLayoutPresetId } from "../product-page-layout-presets";

export function SpacingSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 3,
  step = 0.25,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const numeric = parseFloat(value) || 0;
  const display = value.trim() || `${numeric}rem`;

  return (
    <div className="ppb-control">
      <div className="ppb-control__head">
        <Label>{label}</Label>
        <span className="ppb-control__value">{display}</span>
      </div>
      <input
        type="range"
        className="ppb-slider"
        min={min}
        max={max}
        step={step}
        value={numeric}
        onChange={(e) => onChange(`${Number(e.target.value)}rem`)}
      />
    </div>
  );
}

export function RadiusChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const options = ["0", "4px", "8px", "12px", "16px", "24px"];

  return (
    <div className="ppb-control">
      <Label>Border radius</Label>
      <div className="ppb-chip-row">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={cn("ppb-chip", value === opt && "is-active")}
            onClick={() => onChange(opt)}
          >
            <span className="ppb-chip__preview" style={{ borderRadius: opt }} />
            {opt.replace("px", "")}
          </button>
        ))}
      </div>
    </div>
  );
}

const ANIMATION_OPTIONS = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade" },
  { id: "slide-up", label: "Slide Up" },
] as const;

export function AnimationCards({
  value,
  onChange,
}: {
  value: "none" | "fade" | "slide-up";
  onChange: (value: "none" | "fade" | "slide-up") => void;
}) {
  return (
    <div className="ppb-control">
      <Label>Hero animation</Label>
      <div className="ppb-animation-grid">
        {ANIMATION_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={cn("ppb-animation-card", value === opt.id && "is-active", `ppb-animation-card--${opt.id}`)}
            onClick={() => onChange(opt.id)}
          >
            <span className="ppb-animation-card__demo" />
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LayoutPresetChips({
  activePreset,
  onApply,
}: {
  activePreset: string | null;
  onApply: (presetId: ProductPageLayoutPresetId) => void;
}) {
  return (
    <div className="ppb-presets">
      <span className="ppb-presets__label">Layout presets</span>
      <div className="ppb-presets__chips">
        {PRODUCT_PAGE_LAYOUT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            title={preset.description}
            className={cn("ppb-presets__chip", activePreset === preset.id && "is-active")}
            onClick={() => onApply(preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BuilderCollapsible({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="ppb-collapsible" open={defaultOpen}>
      <summary className="ppb-collapsible__summary">{title}</summary>
      <div className="ppb-collapsible__body">{children}</div>
    </details>
  );
}
