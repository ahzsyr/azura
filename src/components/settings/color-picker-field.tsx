"use client";

import { useCallback, useId, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { isHexColor, normalizeHexColor, toNativePickerHex } from "./color-utils";

const THEME_SWATCHES = [
  { label: "Primary", value: "var(--primary)" },
  { label: "Accent", value: "var(--accent)" },
  { label: "Background", value: "var(--background)" },
  { label: "Foreground", value: "var(--foreground)" },
] as const;

type ColorPickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Show theme CSS variable swatches (block editor). */
  showThemeSwatches?: boolean;
  placeholder?: string;
};

export function ColorPickerField({
  label,
  value,
  onChange,
  className,
  showThemeSwatches = false,
  placeholder = "#047857",
}: ColorPickerFieldProps) {
  const inputId = useId();
  const pickerHex = useMemo(() => toNativePickerHex(value), [value]);
  const pickerDisabled = value.startsWith("var(");

  const commitHex = useCallback(
    (raw: string) => {
      const normalized = normalizeHexColor(raw);
      onChange(normalized ?? raw);
    },
    [onChange],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          className="h-9 w-12 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          value={pickerHex}
          disabled={pickerDisabled}
          title={pickerDisabled ? "Pick a hex color in the field, or use a swatch" : undefined}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} color picker`}
        />
        <Input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            if (isHexColor(raw)) commitHex(raw);
          }}
          placeholder={placeholder}
          className="flex-1 font-mono text-xs"
        />
      </div>
      {showThemeSwatches ? (
        <div className="flex flex-wrap gap-1.5">
          {THEME_SWATCHES.map((swatch) => (
            <button
              key={swatch.value}
              type="button"
              title={swatch.label}
              className="h-6 w-6 rounded border border-border shadow-sm transition-transform hover:scale-110"
              style={{ background: swatch.value }}
              onClick={() => onChange(swatch.value)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
