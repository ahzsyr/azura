"use client";

import { useState } from "react";
import { NumberField, TextField } from "@/components/admin/settings-fields";
import { Label } from "@/components/ui/label";
import { PopupStylePresetPicker } from "@/features/popups/admin/controls/PopupStylePresetPicker";
import type { PopupItemPatch } from "@/features/popups/admin/lib/patch-popup-item";
import type { PopupStylePresetId } from "@/features/popups/admin/lib/popup-style-presets";
import type { PopupItem } from "@/features/popups/popup.schema";
import { cn } from "@/lib/utils";

type Props = {
  item: PopupItem;
  onPatch: (patch: PopupItemPatch) => void;
};

const SHADOW_PRESETS = [
  { id: "none", label: "None", value: "none" },
  { id: "soft", label: "Soft", value: "0 24px 70px rgba(10, 15, 25, 0.18)" },
  { id: "medium", label: "Medium", value: "0 18px 48px rgba(10, 15, 25, 0.12)" },
  { id: "strong", label: "Strong", value: "0 28px 70px rgba(0, 0, 0, 0.45)" },
] as const;

export function PopupAppearanceSettings({ item, onPatch }: Props) {
  const [activePresetId, setActivePresetId] = useState<PopupStylePresetId | null>(null);
  const design = item.design;

  const patchDesign = (partial: Partial<PopupItem["design"]>) => {
    setActivePresetId(null);
    onPatch({ design: partial });
  };

  const matchedShadow =
    SHADOW_PRESETS.find((entry) => entry.value === design.boxShadow)?.id ?? "custom";

  return (
    <div className="popup-admin-section space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Appearance</h3>
        <p className="text-xs text-muted-foreground">
          Presets and visual styling. Changes apply to the underlying design fields.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Style preset</p>
        <PopupStylePresetPicker
          activePresetId={activePresetId}
          onApply={(partial, presetId) => {
            setActivePresetId(presetId);
            onPatch({ design: partial });
          }}
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Colors</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <ColorField
            label="Background"
            value={design.backgroundColor}
            onChange={(backgroundColor) => patchDesign({ backgroundColor })}
          />
          <ColorField
            label="Text"
            value={design.textColor}
            onChange={(textColor) => patchDesign({ textColor })}
          />
          <ColorField
            label="Accent"
            value={design.accentColor}
            onChange={(accentColor) => patchDesign({ accentColor })}
          />
          <ColorField
            label="Border"
            value={design.borderColor}
            onChange={(borderColor) => patchDesign({ borderColor })}
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Shape</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Border radius (px)"
            value={design.borderRadius}
            onChange={(borderRadius) => patchDesign({ borderRadius })}
            min={0}
            max={48}
          />
          <NumberField
            label="Border width (px)"
            value={design.borderWidth}
            onChange={(borderWidth) => patchDesign({ borderWidth })}
            min={0}
            max={8}
          />
          <NumberField
            label="Padding (px)"
            value={design.padding}
            onChange={(padding) => patchDesign({ padding })}
            min={0}
            max={64}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Shadow</Label>
          <div className="popup-admin-chip-grid">
            {SHADOW_PRESETS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={cn("popup-admin-chip", matchedShadow === entry.id && "is-selected")}
                onClick={() => patchDesign({ boxShadow: entry.value })}
              >
                {entry.label}
              </button>
            ))}
          </div>
          {matchedShadow === "custom" && design.boxShadow ? (
            <TextField
              label="Custom shadow"
              value={design.boxShadow}
              onChange={(boxShadow) => patchDesign({ boxShadow })}
            />
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Size</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Width (0 = auto)"
            value={design.width}
            onChange={(width) => patchDesign({ width })}
            min={0}
            max={900}
          />
          <NumberField
            label="Maximum width (px)"
            value={design.maxWidth}
            onChange={(maxWidth) => patchDesign({ maxWidth })}
            min={200}
            max={900}
          />
          <NumberField
            label="Min height (0 = auto)"
            value={design.minHeight}
            onChange={(minHeight) => patchDesign({ minHeight })}
            min={0}
            max={800}
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Typography & motion</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Font family"
            value={design.fontFamily}
            onChange={(fontFamily) => patchDesign({ fontFamily })}
          />
          <NumberField
            label="Font size (px)"
            value={design.fontSize}
            onChange={(fontSize) => patchDesign({ fontSize })}
            min={10}
            max={32}
          />
          <NumberField
            label="Font weight"
            value={design.fontWeight}
            onChange={(fontWeight) => patchDesign({ fontWeight })}
            min={300}
            max={900}
            step={100}
          />
          <NumberField
            label="Animation duration (ms)"
            value={design.animationDurationMs}
            onChange={(animationDurationMs) => patchDesign({ animationDurationMs })}
            min={0}
            max={2000}
            step={20}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Animation</Label>
          <div className="popup-admin-chip-grid">
            {(["none", "fade", "slide", "scale", "bounce"] as const).map((animation) => (
              <button
                key={animation}
                type="button"
                className={cn(
                  "popup-admin-chip",
                  design.animation === animation && "is-selected",
                )}
                onClick={() => patchDesign({ animation })}
              >
                {animation}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff";
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-10 cursor-pointer rounded border bg-transparent p-1"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        />
        <input
          className="h-9 flex-1 rounded-md border px-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#FFFFFF or empty"
        />
      </div>
    </div>
  );
}
