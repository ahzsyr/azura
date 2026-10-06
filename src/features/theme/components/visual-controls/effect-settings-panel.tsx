"use client";

import { Button } from "@/components/ui/button";
import type { VisualEffectSettings } from "@/schemas/theme";
import { ThemeColorPicker, ThemeSlider } from "../theme-studio/controls";

type Props = {
  settings: VisualEffectSettings;
  animationSpeed: number;
  primaryColor: string;
  secondaryColor: string;
  onChange: (patch: Partial<VisualEffectSettings>) => void;
  showColors?: boolean;
  showSpeed?: boolean;
  onSpeedChange?: (speed: number) => void;
};

function overrideLabel(base: string, overridden: boolean): string {
  return overridden ? base : `${base} (brand default)`;
}

export function EffectSettingsPanel({
  settings,
  animationSpeed,
  primaryColor,
  secondaryColor,
  onChange,
  showColors = true,
  showSpeed = true,
  onSpeedChange,
}: Props) {
  const colors = settings.colors;
  const hasPrimary = Boolean(colors?.primary?.trim());
  const hasAccent = Boolean(colors?.accent?.trim());
  const hasSecondary = Boolean(colors?.secondary?.trim());

  return (
    <div className="space-y-4 border-t pt-4">
      <ThemeSlider
        label="Intensity"
        value={settings.intensity}
        min={0.25}
        max={1.5}
        step={0.05}
        onChange={(intensity) => onChange({ intensity })}
      />
      <ThemeSlider
        label="Opacity"
        value={settings.opacity}
        min={0.1}
        max={1}
        step={0.05}
        onChange={(opacity) => onChange({ opacity })}
      />
      {showSpeed ? (
        <ThemeSlider
          label="Speed"
          value={settings.speed ?? animationSpeed}
          min={0.25}
          max={2}
          step={0.05}
          onChange={(speed) => {
            if (onSpeedChange) {
              onSpeedChange(speed);
            } else {
              onChange({ speed });
            }
          }}
        />
      ) : null}
      {showColors ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <ThemeColorPicker
              label={overrideLabel("Primary override", hasPrimary)}
              value={colors?.primary ?? primaryColor}
              onChange={(primary) =>
                onChange({
                  colors: { ...colors, primary },
                })
              }
            />
            <ThemeColorPicker
              label={overrideLabel("Accent override", hasAccent)}
              value={colors?.accent ?? secondaryColor}
              onChange={(accent) =>
                onChange({
                  colors: { ...colors, accent },
                })
              }
            />
            <ThemeColorPicker
              label={overrideLabel("Secondary override", hasSecondary)}
              value={colors?.secondary ?? primaryColor}
              onChange={(secondary) =>
                onChange({
                  colors: { ...colors, secondary },
                })
              }
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ colors: undefined })}
          >
            Reset color overrides
          </Button>
        </>
      ) : null}
    </div>
  );
}
