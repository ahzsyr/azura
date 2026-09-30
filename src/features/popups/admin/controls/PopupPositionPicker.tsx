"use client";

import { cn } from "@/lib/utils";
import type { PopupPosition, PopupType } from "@/features/popups/popup.schema";

const ALL_POSITIONS: Array<{ value: PopupPosition; label: string }> = [
  { value: "bottom-end", label: "Bottom end" },
  { value: "bottom-start", label: "Bottom start" },
  { value: "top-end", label: "Top end" },
  { value: "top-start", label: "Top start" },
  { value: "center", label: "Center" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "custom", label: "Custom" },
];

function positionsForType(type: PopupType): Array<{ value: PopupPosition; label: string }> {
  if (type === "modal") {
    return ALL_POSITIONS.filter((p) =>
      ["center", "bottom-end", "bottom-start", "top-end", "top-start", "custom"].includes(p.value),
    );
  }
  if (type === "slideIn") {
    return ALL_POSITIONS.filter((p) =>
      ["left", "right", "top", "bottom", "bottom-start", "bottom-end", "custom"].includes(p.value),
    );
  }
  if (type === "floatingButton") {
    return ALL_POSITIONS.filter((p) =>
      ["bottom-end", "bottom-start", "top-end", "top-start", "left", "right", "custom"].includes(
        p.value,
      ),
    );
  }
  return ALL_POSITIONS.filter((p) => p.value !== "center");
}

type Props = {
  value: PopupPosition;
  type: PopupType;
  onChange: (position: PopupPosition) => void;
};

export function PopupPositionPicker({ value, type, onChange }: Props) {
  const options = positionsForType(type);

  return (
    <div className="popup-admin-chip-grid" role="listbox" aria-label="Position">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selected}
            className={cn("popup-admin-chip", selected && "is-selected")}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
