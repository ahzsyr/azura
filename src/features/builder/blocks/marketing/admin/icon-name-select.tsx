"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { MARKETING_ICON_OPTIONS } from "@/features/builder/blocks/marketing/lib/icon-map";
import { IconPickerField } from "@/features/icons/components/icon-picker-field";
import { Icon } from "@/features/icons/components/icon";
import { looksLikeIconLibraryId } from "@/features/icons/lib/icon-id-utils";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** When true, value is treated as iconId from the Icon Library. */
  libraryMode?: boolean;
};

export function IconNameSelect({ value, onChange, label = "Icon", libraryMode = false }: Props) {
  const [mode, setMode] = useState<"legacy" | "library">(
    libraryMode || looksLikeIconLibraryId(value) ? "library" : "legacy",
  );

  if (mode === "library" || libraryMode) {
    return (
      <div className="space-y-2">
        <IconPickerField label={label} value={value} onChange={onChange} />
        {!libraryMode ? (
          <button
            type="button"
            className="text-xs text-muted-foreground underline hover:text-foreground"
            onClick={() => setMode("legacy")}
          >
            Use legacy marketing icon list
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label ? <Label className="text-xs">{label}</Label> : null}
      <div className="flex items-center gap-2">
        {value && looksLikeIconLibraryId(value) ? <Icon iconId={value} className="h-4 w-4" /> : null}
        <select
          className={cn("w-full rounded-md border h-9 px-2 text-sm", label ? "mt-0" : "")}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">None</option>
          {MARKETING_ICON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="text-xs text-muted-foreground underline hover:text-foreground"
        onClick={() => setMode("library")}
      >
        Pick from Icon Library (stores iconId)
      </button>
    </div>
  );
}
