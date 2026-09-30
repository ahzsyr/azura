"use client";

import { cn } from "@/lib/utils";
import {
  POPUP_STYLE_PRESETS,
  type PopupStylePresetId,
} from "@/features/popups/admin/lib/popup-style-presets";
import type { PopupDesign } from "@/features/popups/popup.schema";

type Props = {
  onApply: (design: Partial<PopupDesign>, presetId: PopupStylePresetId) => void;
  activePresetId?: PopupStylePresetId | null;
};

export function PopupStylePresetPicker({ onApply, activePresetId }: Props) {
  return (
    <div className="popup-admin-preset-grid" role="listbox" aria-label="Style presets">
      {POPUP_STYLE_PRESETS.map((preset) => {
        const selected = activePresetId === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            role="option"
            aria-selected={selected}
            className={cn("popup-admin-preset-card", selected && "is-selected")}
            onClick={() => onApply(preset.design, preset.id)}
          >
            <span
              className="popup-admin-preset-swatch"
              style={{
                background: preset.design.backgroundColor || "#fff",
                color: preset.design.textColor || "#111",
                borderColor: preset.design.borderColor || "#ddd",
                borderRadius: `${Math.min(preset.design.borderRadius ?? 8, 16)}px`,
              }}
              aria-hidden
            >
              Aa
            </span>
            <span className="block text-sm font-medium">{preset.label}</span>
            <span className="block text-xs text-muted-foreground">{preset.description}</span>
          </button>
        );
      })}
    </div>
  );
}
