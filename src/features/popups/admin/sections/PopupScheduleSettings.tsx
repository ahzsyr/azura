"use client";

import { TextField, ToggleField } from "@/components/admin/settings-fields";
import type { PopupItemPatch } from "@/features/popups/admin/lib/patch-popup-item";
import type { PopupItem } from "@/features/popups/popup.schema";

type Props = {
  item: PopupItem;
  onPatch: (patch: PopupItemPatch) => void;
};

export function PopupScheduleSettings({ item, onPatch }: Props) {
  return (
    <div className="popup-admin-section space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Schedule</h3>
        <p className="text-xs text-muted-foreground">
          Optionally limit when this popup can appear.
        </p>
      </div>
      <ToggleField
        label="Enable schedule window"
        checked={item.schedule.enabled}
        onChange={(enabled) => onPatch({ schedule: { enabled } })}
      />
      {item.schedule.enabled ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Start (ISO datetime)"
            value={item.schedule.startAt}
            onChange={(startAt) => onPatch({ schedule: { startAt } })}
            placeholder="2026-01-01T00:00:00.000Z"
          />
          <TextField
            label="End (ISO datetime)"
            value={item.schedule.endAt}
            onChange={(endAt) => onPatch({ schedule: { endAt } })}
            placeholder="2026-12-31T23:59:59.000Z"
          />
        </div>
      ) : null}
    </div>
  );
}
