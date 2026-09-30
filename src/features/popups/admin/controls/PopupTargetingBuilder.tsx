"use client";

import { TextAreaField, ToggleField } from "@/components/admin/settings-fields";
import { cn } from "@/lib/utils";
import type { PopupDeviceTargeting, PopupPageTargeting } from "@/features/popups/popup.schema";

type Props = {
  pageTargeting: PopupPageTargeting;
  devices: PopupDeviceTargeting;
  onPageTargetingChange: (patch: Partial<PopupPageTargeting>) => void;
  onDevicesChange: (patch: Partial<PopupDeviceTargeting>) => void;
};

export function PopupTargetingBuilder({
  pageTargeting,
  devices,
  onPageTargetingChange,
  onDevicesChange,
}: Props) {
  const specific = pageTargeting.mode !== "all";

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-medium">Where should it appear?</p>
        <div className="space-y-2">
          <button
            type="button"
            className={cn("popup-admin-radio-row", !specific && "is-selected")}
            onClick={() => onPageTargetingChange({ mode: "all", paths: pageTargeting.paths })}
          >
            <span className={cn("popup-admin-radio-dot", !specific && "is-selected")} />
            <span className="text-sm font-medium">All pages</span>
          </button>
          <button
            type="button"
            className={cn("popup-admin-radio-row", specific && "is-selected")}
            onClick={() =>
              onPageTargetingChange({
                mode: pageTargeting.mode === "exclude" ? "exclude" : "include",
              })
            }
          >
            <span className={cn("popup-admin-radio-dot", specific && "is-selected")} />
            <span className="text-sm font-medium">Specific pages</span>
          </button>
        </div>

        {specific ? (
          <div className="space-y-3 rounded-md border p-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={cn(
                  "popup-admin-chip",
                  pageTargeting.mode === "include" && "is-selected",
                )}
                onClick={() => onPageTargetingChange({ mode: "include" })}
              >
                Include
              </button>
              <button
                type="button"
                className={cn(
                  "popup-admin-chip",
                  pageTargeting.mode === "exclude" && "is-selected",
                )}
                onClick={() => onPageTargetingChange({ mode: "exclude" })}
              >
                Exclude
              </button>
            </div>
            <TextAreaField
              label="Paths (one per line)"
              description="Examples: /products, /blog/*, /contact"
              value={pageTargeting.paths.join("\n")}
              onChange={(v) =>
                onPageTargetingChange({
                  paths: v
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean),
                })
              }
              rows={4}
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Devices</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <ToggleField
            label="Desktop"
            checked={devices.desktop}
            onChange={(desktop) => onDevicesChange({ desktop })}
          />
          <ToggleField
            label="Tablet"
            checked={devices.tablet}
            onChange={(tablet) => onDevicesChange({ tablet })}
          />
          <ToggleField
            label="Mobile"
            checked={devices.mobile}
            onChange={(mobile) => onDevicesChange({ mobile })}
          />
        </div>
      </div>
    </div>
  );
}
