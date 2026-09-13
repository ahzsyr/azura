"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPickerField } from "@/components/settings/color-picker-field";
import { cn } from "@/lib/utils";
import type { CatalogNavigationAppearance } from "@/features/catalog/navigation/types";
import { RADIUS_PRESETS, SHADOW_PRESETS } from "@/features/catalog/navigation/layout-semantics";
import {
  applyAppearanceStylePreset,
  defaultCatalogNavigationAppearance,
  layoutPatchForAppearanceStyle,
  type AppearanceStylePresetId,
} from "./nav-style-presets";
import type { CatalogNavigationLayout } from "@/features/catalog/navigation/types";

const STYLE_PRESETS: Array<{ id: AppearanceStylePresetId; label: string; hint: string }> = [
  { id: "minimal", label: "Minimal", hint: "Quiet, theme-aware" },
  { id: "pills", label: "Pills", hint: "Rounded active chip" },
  { id: "elevated", label: "Elevated", hint: "Soft surface + shadow" },
  { id: "underline", label: "Underline", hint: "Active underline" },
  { id: "custom", label: "Custom", hint: "Keep your values" },
];

const selectedClass =
  "border-primary bg-primary text-primary-foreground shadow-sm font-medium";
const idleClass = "border-border bg-background hover:bg-muted/50";

const RADIUS_OPTIONS = [
  { id: "square", label: "Square" },
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
  { id: "pill", label: "Pill" },
  { id: "custom", label: "Custom" },
] as const;

const SHADOW_OPTIONS = [
  { id: "none", label: "None" },
  { id: "soft", label: "Soft" },
  { id: "medium", label: "Medium" },
  { id: "strong", label: "Strong" },
  { id: "custom", label: "Custom" },
] as const;

const COLOR_KEYS = [
  ["background", "Background"],
  ["foreground", "Text"],
  ["activeBackground", "Active background"],
  ["activeForeground", "Active text"],
  ["hoverBackground", "Hover background"],
  ["hoverForeground", "Hover text"],
  ["border", "Border"],
] as const;

function matchRadiusPreset(value?: string): (typeof RADIUS_OPTIONS)[number]["id"] {
  if (!value) return "small";
  const entry = Object.entries(RADIUS_PRESETS).find(([, v]) => v === value);
  return (entry?.[0] as (typeof RADIUS_OPTIONS)[number]["id"] | undefined) ?? "custom";
}

function matchShadowPreset(value?: string): (typeof SHADOW_OPTIONS)[number]["id"] {
  if (!value || value === "none") return "none";
  const entry = Object.entries(SHADOW_PRESETS).find(([, v]) => v === value);
  return (entry?.[0] as (typeof SHADOW_OPTIONS)[number]["id"] | undefined) ?? "custom";
}

export function NavAppearancePanel({
  appearance,
  onPatchAppearance,
  onReplaceAppearance,
  onPatchLayout,
}: {
  appearance: CatalogNavigationAppearance;
  onPatchAppearance: (patch: Partial<CatalogNavigationAppearance>) => void;
  onReplaceAppearance: (next: CatalogNavigationAppearance) => void;
  onPatchLayout?: (patch: Partial<CatalogNavigationLayout>) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const isCustomTheme = appearance.theme === "custom";
  const styleId = (appearance.appearanceStyle ?? "minimal") as AppearanceStylePresetId;
  const radiusId = matchRadiusPreset(appearance.borderRadius);
  const shadowId = matchShadowPreset(appearance.shadow);

  const applyStyle = (id: AppearanceStylePresetId) => {
    onReplaceAppearance(applyAppearanceStylePreset(id, appearance));
    onPatchLayout?.(layoutPatchForAppearanceStyle(id));
  };

  const restoreDefaults = () => {
    onReplaceAppearance(defaultCatalogNavigationAppearance());
    onPatchLayout?.(layoutPatchForAppearanceStyle("minimal"));
  };

  const resetColor = (key: (typeof COLOR_KEYS)[number][0]) => {
    onPatchAppearance({ [key]: undefined });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Label className="text-xs font-medium">Navigation style</Label>
          <p className="text-xs text-muted-foreground">
            Pick a look, then adjust theme and colors if needed.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={restoreDefaults}>
          Restore defaults
        </Button>
      </div>

      <section className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {STYLE_PRESETS.map((preset) => {
            const selected = styleId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selected}
                onClick={() => applyStyle(preset.id)}
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

      <section className="space-y-2">
        <Label className="text-xs font-medium">Theme</Label>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={!isCustomTheme}
              onChange={() => onPatchAppearance({ theme: "inherit" })}
            />
            Inherit from active theme
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={isCustomTheme}
              onChange={() => onPatchAppearance({ theme: "custom" })}
            />
            Custom
          </label>
        </div>
      </section>

      {isCustomTheme || styleId !== "minimal" ? (
        <section className="space-y-3">
          <Label className="text-xs font-medium">Colors</Label>
          <div className="grid gap-4 sm:grid-cols-2">
            {COLOR_KEYS.map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <ColorPickerField
                  label={label}
                  value={appearance[key] ?? ""}
                  onChange={(value) =>
                    onPatchAppearance({
                      theme: appearance.theme === "inherit" ? "custom" : appearance.theme,
                      [key]: value.trim() || undefined,
                    })
                  }
                  showThemeSwatches
                  placeholder="Theme default"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => resetColor(key)}
                >
                  Reset to theme
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Appearance inherits theme tokens. Switch to Custom or pick a style to override colors.
        </p>
      )}

      <section className="space-y-2">
        <Label className="text-xs font-medium">Shape</Label>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((opt) => (
            <Button
              key={opt.id}
              type="button"
              size="sm"
              variant={radiusId === opt.id ? "default" : "outline"}
              onClick={() => {
                if (opt.id === "custom") return;
                onPatchAppearance({ borderRadius: RADIUS_PRESETS[opt.id] });
              }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        {(radiusId === "custom" ||
          (appearance.borderRadius && !Object.values(RADIUS_PRESETS).includes(appearance.borderRadius))) && (
          <div>
            <Label className="text-xs">Custom radius</Label>
            <Input
              className="mt-1 max-w-xs"
              value={appearance.borderRadius ?? ""}
              placeholder="e.g. 10px"
              onChange={(e) =>
                onPatchAppearance({ borderRadius: e.target.value.trim() || undefined })
              }
            />
          </div>
        )}
      </section>

      <section className="space-y-2">
        <Label className="text-xs font-medium">Shadow</Label>
        <div className="flex flex-wrap gap-2">
          {SHADOW_OPTIONS.map((opt) => (
            <Button
              key={opt.id}
              type="button"
              size="sm"
              variant={shadowId === opt.id ? "default" : "outline"}
              onClick={() => {
                if (opt.id === "custom") {
                  onPatchAppearance({ shadow: appearance.shadow || "0 2px 8px rgba(0,0,0,0.1)" });
                  return;
                }
                onPatchAppearance({ shadow: SHADOW_PRESETS[opt.id] });
              }}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        {shadowId === "custom" ? (
          <div>
            <Label className="text-xs">Custom shadow</Label>
            <Input
              className="mt-1"
              value={appearance.shadow ?? ""}
              placeholder="CSS box-shadow"
              onChange={(e) => onPatchAppearance({ shadow: e.target.value.trim() || undefined })}
            />
          </div>
        ) : null}
      </section>

      <section className="space-y-2 border-t border-border pt-4">
        <button
          type="button"
          className="text-sm font-medium text-foreground"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          Advanced {advancedOpen ? "▴" : "▾"}
        </button>
        {advancedOpen ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["background", "Background"],
                ["foreground", "Foreground"],
                ["activeBackground", "Active background"],
                ["activeForeground", "Active foreground"],
                ["hoverBackground", "Hover background"],
                ["hoverForeground", "Hover foreground"],
                ["border", "Border"],
                ["borderRadius", "Border radius"],
                ["shadow", "Shadow"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  value={appearance[key] ?? ""}
                  placeholder="CSS value"
                  onChange={(e) =>
                    onPatchAppearance({ [key]: e.target.value.trim() || undefined })
                  }
                />
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
