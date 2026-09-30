"use client";

import { IconPickerPanel, type IconPickerSelectResult } from "./icon-picker-panel";

type Props = {
  onSelect?: (result: IconPickerSelectResult) => void;
  active?: boolean;
  selectedId?: string | null;
};

/** Compact alias — prefer IconPickerPanel in dialogs. */
export function IconPicker({ onSelect, active = true, selectedId }: Props) {
  return (
    <IconPickerPanel
      active={active}
      selectedId={selectedId}
      onSelect={(result) => onSelect?.(result)}
    />
  );
}

export type { IconPickerSelectResult };
