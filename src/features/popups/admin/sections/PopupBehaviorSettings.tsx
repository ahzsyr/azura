"use client";

import { NumberField, TextField, ToggleField } from "@/components/admin/settings-fields";
import { Label } from "@/components/ui/label";
import { PopupPositionPicker } from "@/features/popups/admin/controls/PopupPositionPicker";
import { PopupTriggerBuilder } from "@/features/popups/admin/controls/PopupTriggerBuilder";
import { PopupTypePicker } from "@/features/popups/admin/controls/PopupTypePicker";
import type { PopupItemPatch } from "@/features/popups/admin/lib/patch-popup-item";
import type { PopupCloseAction, PopupItem } from "@/features/popups/popup.schema";
import { cn } from "@/lib/utils";

type Props = {
  item: PopupItem;
  allItems: PopupItem[];
  onPatch: (patch: PopupItemPatch) => void;
};

export function PopupBehaviorSettings({ item, allItems, onPatch }: Props) {
  const isFloating = item.type === "floatingButton";
  const linkedOptions = allItems.filter(
    (entry) => entry.id !== item.id && entry.type !== "floatingButton",
  );
  const autoHideEnabled = item.autoHideMs > 0;
  const autoHideSeconds = Math.max(1, Math.round(item.autoHideMs / 1000) || 10);

  return (
    <div className="popup-admin-section space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Behavior</h3>
        <p className="text-xs text-muted-foreground">
          Type, placement, and when this popup appears.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Choose popup type</p>
        <PopupTypePicker
          value={item.type}
          onChange={(type) => onPatch({ type })}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          {item.type === "slideIn" ? "Direction / position" : "Position"}
        </p>
        <PopupPositionPicker
          value={item.position}
          type={item.type}
          onChange={(position) => onPatch({ position })}
        />
      </div>

      <ToggleField
        label="Dismissible"
        checked={item.dismissible}
        onChange={(dismissible) => onPatch({ dismissible })}
      />

      {isFloating ? (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">Floating button</p>
          <TextField
            label="Icon name (Lucide)"
            value={item.design.icon}
            onChange={(icon) => onPatch({ design: { icon } })}
            placeholder="MessageCircle"
          />
          <TextField
            label="Icon URL (optional)"
            value={item.design.iconUrl}
            onChange={(iconUrl) => onPatch({ design: { iconUrl } })}
          />
          <div className="space-y-1.5">
            <Label className="text-xs">Linked popup</Label>
            <select
              className="h-9 w-full rounded-md border px-2 text-sm"
              value={item.linkedPopupId}
              onChange={(e) => onPatch({ linkedPopupId: e.target.value })}
            >
              <option value="">None — use primary CTA link</option>
              {linkedOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            Floating buttons stay available on the page and do not use page triggers.
          </p>
        </div>
      ) : (
        <>
          <PopupTriggerBuilder
            value={item.trigger}
            onChange={(trigger) => onPatch({ trigger })}
          />

          <div className="space-y-3 rounded-md border p-3">
            <ToggleField
              label="Hide automatically"
              checked={autoHideEnabled}
              onChange={(enabled) =>
                onPatch({ autoHideMs: enabled ? autoHideSeconds * 1000 : 0 })
              }
            />
            {autoHideEnabled ? (
              <NumberField
                label="After (seconds)"
                value={autoHideSeconds}
                onChange={(seconds) =>
                  onPatch({ autoHideMs: Math.max(1, seconds) * 1000 })
                }
                min={1}
                max={600}
              />
            ) : null}
            <p className="text-xs text-muted-foreground">
              Uses the same close behavior below (dismiss or minimize).
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">When closed</p>
            <div className="popup-admin-chip-grid" role="listbox" aria-label="Close action">
              {(
                [
                  {
                    value: "dismiss" as PopupCloseAction,
                    label: "Dismiss permanently",
                    hint: "Counts toward frequency rules",
                  },
                  {
                    value: "minimize" as PopupCloseAction,
                    label: "Minimize to corner",
                    hint: "Restore chip this session only",
                  },
                ] as const
              ).map((option) => {
                const selected = item.closeAction === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn("popup-admin-policy-card", selected && "is-selected")}
                    onClick={() => onPatch({ closeAction: option.value })}
                  >
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
