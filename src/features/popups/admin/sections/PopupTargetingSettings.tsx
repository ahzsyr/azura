"use client";

import { PopupTargetingBuilder } from "@/features/popups/admin/controls/PopupTargetingBuilder";
import type { PopupItemPatch } from "@/features/popups/admin/lib/patch-popup-item";
import type { PopupItem } from "@/features/popups/popup.schema";

type Props = {
  item: PopupItem;
  onPatch: (patch: PopupItemPatch) => void;
};

export function PopupTargetingSettings({ item, onPatch }: Props) {
  return (
    <div className="popup-admin-section space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Targeting</h3>
        <p className="text-xs text-muted-foreground">
          Choose which pages and devices can show this popup.
        </p>
      </div>
      <PopupTargetingBuilder
        pageTargeting={item.pageTargeting}
        devices={item.devices}
        onPageTargetingChange={(pageTargeting) => onPatch({ pageTargeting })}
        onDevicesChange={(devices) => onPatch({ devices })}
      />
    </div>
  );
}
