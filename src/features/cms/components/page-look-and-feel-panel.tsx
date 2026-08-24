"use client";

import type { PageVisualSettings } from "@/schemas/visual-settings";
import type { VisualInheritMode } from "@/schemas/visual-settings";
import {
  BACKGROUND_EFFECT_OPTIONS,
  CURSOR_EFFECT_OPTIONS,
  TEXT_EFFECT_OPTIONS,
} from "@/features/theme/effect-options";
import {
  CollapsibleSettingsGroup,
  EffectSelectField,
  InheritModeField,
} from "@/features/theme/components/visual-controls";
import { Label } from "@/components/ui/label";

type Props = {
  value: PageVisualSettings;
  onChange: (value: PageVisualSettings) => void;
};

export function PageLookAndFeelPanel({ value, onChange }: Props) {
  const siteEffects = value.siteEffects ?? {};

  const patch = (patchValue: Partial<PageVisualSettings>) => {
    onChange({ ...value, ...patchValue });
  };

  const patchSiteEffect = (key: "background" | "cursor" | "text", mode: VisualInheritMode) => {
    onChange({
      ...value,
      siteEffects: { ...siteEffects, [key]: mode },
    });
  };

  return (
    <div className="space-y-4">
      <CollapsibleSettingsGroup
        title="Site canvas effects"
        description="Override or disable global background, cursor, and text effects on this page."
        defaultOpen
      >
        <InheritModeField
          label="Background canvas"
          value={siteEffects.background ?? "inherit"}
          onChange={(mode) => patchSiteEffect("background", mode)}
        />
        {siteEffects.background === "custom" && (
          <EffectSelectField
            label="Page background effect"
            value={value.backgroundEffect ?? ""}
            options={BACKGROUND_EFFECT_OPTIONS}
            onChange={(backgroundEffect) => patch({ backgroundEffect: backgroundEffect || null })}
          />
        )}

        <InheritModeField
          label="Cursor effect"
          value={siteEffects.cursor ?? "inherit"}
          onChange={(mode) => patchSiteEffect("cursor", mode)}
        />
        {siteEffects.cursor === "custom" && (
          <EffectSelectField
            label="Page cursor"
            value={value.cursorEffect ?? ""}
            options={CURSOR_EFFECT_OPTIONS}
            onChange={(cursorEffect) => patch({ cursorEffect: cursorEffect || null })}
          />
        )}

        <InheritModeField
          label="Text effect"
          value={siteEffects.text ?? "inherit"}
          onChange={(mode) => patchSiteEffect("text", mode)}
        />
        {siteEffects.text === "custom" && (
          <EffectSelectField
            label="Page text effect"
            value={value.textEffect ?? ""}
            options={TEXT_EFFECT_OPTIONS}
            onChange={(textEffect) => patch({ textEffect: textEffect || null })}
          />
        )}
      </CollapsibleSettingsGroup>

      <CollapsibleSettingsGroup title="Page motion" description="Scroll and entrance animations.">
        <div>
          <Label className="mb-2 block">Animations</Label>
          <select
            className="h-10 w-full rounded-md border px-3 text-sm"
            value={
              value.animationsEnabled === null || value.animationsEnabled === undefined
                ? "inherit"
                : value.animationsEnabled
                  ? "on"
                  : "off"
            }
            onChange={(e) => {
              const v = e.target.value;
              patch({
                animationsEnabled: v === "inherit" ? null : v === "on",
              });
            }}
          >
            <option value="inherit">Inherit site setting</option>
            <option value="on">Enabled</option>
            <option value="off">Disabled</option>
          </select>
        </div>
      </CollapsibleSettingsGroup>
    </div>
  );
}
