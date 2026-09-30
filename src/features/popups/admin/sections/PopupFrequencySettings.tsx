"use client";

import { PopupFrequencyBuilder } from "@/features/popups/admin/controls/PopupFrequencyBuilder";
import type { PopupItemPatch } from "@/features/popups/admin/lib/patch-popup-item";
import type { PopupItem } from "@/features/popups/popup.schema";

type Props = {
  item: PopupItem;
  onPatch: (patch: PopupItemPatch) => void;
};

export function PopupFrequencySettings({ item, onPatch }: Props) {
  return (
    <div className="popup-admin-section space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Frequency</h3>
        <p className="text-xs text-muted-foreground">
          Control how often visitors see this popup.
        </p>
      </div>
      <PopupFrequencyBuilder
        value={item.frequency}
        onChange={(frequency) => onPatch({ frequency })}
      />
    </div>
  );
}
