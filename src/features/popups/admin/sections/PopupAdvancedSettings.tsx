"use client";

import { NumberField, TextField } from "@/components/admin/settings-fields";
import type { PopupItemPatch } from "@/features/popups/admin/lib/patch-popup-item";
import type { PopupItem } from "@/features/popups/popup.schema";

type Props = {
  item: PopupItem;
  allItems: PopupItem[];
  onPatch: (patch: PopupItemPatch) => void;
};

export function PopupAdvancedSettings({ item, allItems, onPatch }: Props) {
  const linkedOptions = allItems.filter((entry) => entry.id !== item.id);

  return (
    <div className="popup-admin-section space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Advanced</h3>
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          These settings are intended for advanced customization. Prefer the other sections
          unless you need precise offsets, storage keys, or developer options.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Custom positioning</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField
            label="Top (px)"
            value={item.customOffset.top}
            onChange={(top) => onPatch({ customOffset: { top } })}
            min={0}
            max={500}
          />
          <NumberField
            label="Right (px)"
            value={item.customOffset.right}
            onChange={(right) => onPatch({ customOffset: { right } })}
            min={0}
            max={500}
          />
          <NumberField
            label="Bottom (px)"
            value={item.customOffset.bottom}
            onChange={(bottom) => onPatch({ customOffset: { bottom } })}
            min={0}
            max={500}
          />
          <NumberField
            label="Left (px)"
            value={item.customOffset.left}
            onChange={(left) => onPatch({ customOffset: { left } })}
            min={0}
            max={500}
          />
        </div>
        <NumberField
          label="Z-index"
          value={item.zIndex}
          onChange={(zIndex) => onPatch({ zIndex })}
          min={1000}
          max={99999}
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Persistence keys</p>
        <TextField
          label="Dismiss key"
          value={item.dismissKey}
          onChange={(dismissKey) => onPatch({ dismissKey })}
        />
        <TextField
          label="Frequency storage key"
          value={item.frequency.storageKey}
          onChange={(storageKey) => onPatch({ frequency: { storageKey } })}
        />
      </div>

      {item.type !== "floatingButton" ? (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Linked popup ID</p>
          <select
            className="h-9 w-full rounded-md border px-2 text-sm"
            value={item.linkedPopupId}
            onChange={(e) => onPatch({ linkedPopupId: e.target.value })}
          >
            <option value="">None</option>
            {linkedOptions.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} ({entry.type})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {item.content.blocks.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Content blocks ({item.content.blocks.length}) are preserved. There is no blocks editor
          in this UI.
        </p>
      ) : null}
    </div>
  );
}
