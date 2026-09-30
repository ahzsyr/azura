"use client";

import type { BlockSectionBackground } from "@/types/block-system";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ColorPickerField } from "./color-picker-field";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { EffectSelectField } from "@/features/theme/components/visual-controls/effect-select-field";
import { BACKGROUND_EFFECT_OPTIONS } from "@/features/theme/effect-options";

const TYPE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "color", label: "Solid color" },
  { value: "gradient", label: "Gradient" },
  { value: "image", label: "Image" },
  { value: "pattern", label: "Animated pattern" },
  { value: "particles", label: "Particles" },
  { value: "grid", label: "Grid" },
  { value: "glass", label: "Glass overlay" },
] as const;

type Props = {
  value: BlockSectionBackground | undefined;
  onChange: (value: BlockSectionBackground) => void;
};

export function SectionBackgroundField({ value, onChange }: Props) {
  const bg = value ?? { type: "none" as const };
  const type = bg.type ?? "none";

  return (
    <div className="space-y-3">
      <EffectSelectField
        label="Section background"
        value={type}
        options={TYPE_OPTIONS}
        onChange={(next) => onChange({ ...bg, type: next as BlockSectionBackground["type"] })}
      />

      {type === "color" && (
        <ColorPickerField
          label="Background color"
          value={bg.color ?? "#0a0f0d"}
          onChange={(color) => onChange({ ...bg, color })}
        />
      )}

      {type === "gradient" && (
        <div className="space-y-2">
          <Label>CSS gradient</Label>
          <Input
            className="font-mono text-xs"
            placeholder="linear-gradient(135deg, #047857, #0a0f0d)"
            value={bg.gradient ?? ""}
            onChange={(e) => onChange({ ...bg, gradient: e.target.value })}
          />
          {bg.gradient ? (
            <div
              className="h-12 rounded-md border"
              style={{ background: bg.gradient }}
              aria-hidden
            />
          ) : null}
        </div>
      )}

      {type === "image" && (
        <>
          <UrlPrimaryMediaPickerField
            label="Background image"
            url={bg.imageUrl ?? ""}
            onPick={({ url, mediaId }) =>
              onChange({
                ...bg,
                imageUrl: url || undefined,
                mediaAssetId: mediaId ?? undefined,
              })
            }
            previewSize={{ width: 200, height: 80 }}
          />
          <div>
            <Label>Overlay opacity ({Math.round((bg.overlayOpacity ?? 0.4) * 100)}%)</Label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={bg.overlayOpacity ?? 0.4}
              onChange={(e) => onChange({ ...bg, overlayOpacity: Number(e.target.value) })}
              className="mt-2 w-full"
            />
          </div>
        </>
      )}

      {type === "pattern" && (
        <EffectSelectField
          label="Pattern effect"
          value={bg.pattern ?? ""}
          options={BACKGROUND_EFFECT_OPTIONS.filter((o) => o.value !== "aurora")}
          onChange={(pattern) => onChange({ ...bg, pattern: pattern || undefined })}
        />
      )}

      {type === "glass" && (
        <div>
          <Label>Blur amount</Label>
          <Input
            className="mt-1 font-mono text-xs"
            placeholder="12px"
            value={bg.glassBlur ?? ""}
            onChange={(e) => onChange({ ...bg, glassBlur: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
