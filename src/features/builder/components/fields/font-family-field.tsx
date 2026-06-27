"use client";

import { Label } from "@/components/ui/label";
import { GOOGLE_FONT_OPTIONS } from "@/features/theme/constants";

export type FontFamilyMode = "inherit" | "theme-body" | "theme-heading" | "custom";

const FONT_INHERIT = "";
const FONT_BODY_TOKEN = "var(--font-body)";
const FONT_HEADING_TOKEN = "var(--font-heading)";

export function fontValueToMode(value: string | undefined): FontFamilyMode {
  if (!value) return "inherit";
  if (value === FONT_BODY_TOKEN) return "theme-body";
  if (value === FONT_HEADING_TOKEN) return "theme-heading";
  return "custom";
}

export function fontModeToValue(mode: FontFamilyMode, customFont?: string): string {
  if (mode === "inherit") return FONT_INHERIT;
  if (mode === "theme-body") return FONT_BODY_TOKEN;
  if (mode === "theme-heading") return FONT_HEADING_TOKEN;
  return customFont ?? GOOGLE_FONT_OPTIONS[0];
}

type FontFamilyFieldProps = {
  label?: string;
  value: string | undefined;
  onChange: (value: string) => void;
};

export function FontFamilyField({
  label = "Font family",
  value,
  onChange,
}: FontFamilyFieldProps) {
  const mode = fontValueToMode(value);
  const customFont =
    mode === "custom" && value && !value.startsWith("var(") ? value : GOOGLE_FONT_OPTIONS[0];

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
        value={mode}
        onChange={(e) => {
          const next = e.target.value as FontFamilyMode;
          onChange(fontModeToValue(next, customFont));
        }}
      >
        <option value="inherit">Inherit from theme</option>
        <option value="theme-body">Theme body font</option>
        <option value="theme-heading">Theme heading font</option>
        <option value="custom">Custom font</option>
      </select>
      {mode === "custom" && (
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={customFont}
          onChange={(e) => onChange(e.target.value)}
        >
          {GOOGLE_FONT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
