"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LocalizedBlockInput,
  LocalizedBlockTextarea,
} from "@/features/builder/block-translation-context";
import {
  ContactAdminTabs,
  SelectField,
  makeContactSetProp,
} from "@/features/builder/blocks/contact/admin/shared-contact-fields";
import { BusinessHoursFields } from "@/features/builder/blocks/contact/admin/business-hours-fields";
import type { BusinessHoursDay } from "@/features/builder/blocks/contact/schemas/business-hours";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

export function ContactLocationBlockFields({ block, onChange }: Props) {
  const setProp = makeContactSetProp(block, onChange);
  const p = block.props;

  return (
    <ContactAdminTabs
      block={block}
      onChange={onChange}
      content={
        <>
          <LocalizedBlockInput block={block} field="addressLine1" label="Address line 1" />
          <LocalizedBlockInput block={block} field="addressLine2" label="Address line 2" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <LocalizedBlockInput block={block} field="city" label="City" />
            <LocalizedBlockInput block={block} field="country" label="Country" />
          </div>
          <LocalizedBlockInput block={block} field="postalCode" label="Postal code" />

          <BusinessHoursFields
            value={(p.businessHours as BusinessHoursDay[]) ?? []}
            onChange={(next) => setProp("businessHours", next)}
          />
          <LocalizedBlockTextarea block={block} field="hours" label="Fallback hours summary" rows={2} />

          <div className="border-t pt-3 space-y-3">
            <Label className="text-xs font-medium">Map links</Label>
            <div>
              <Label className="text-xs">Google Maps URL</Label>
              <Input
                className="mt-1 h-8 text-sm"
                value={(p.googleMapsUrl as string) ?? ""}
                onChange={(e) => setProp("googleMapsUrl", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Bing Maps URL</Label>
              <Input
                className="mt-1 h-8 text-sm"
                value={(p.bingMapsUrl as string) ?? ""}
                onChange={(e) => setProp("bingMapsUrl", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Apple Maps URL</Label>
              <Input
                className="mt-1 h-8 text-sm"
                value={(p.appleMapsUrl as string) ?? ""}
                onChange={(e) => setProp("appleMapsUrl", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">OpenStreetMap URL</Label>
              <Input
                className="mt-1 h-8 text-sm"
                value={(p.osmUrl as string) ?? ""}
                onChange={(e) => setProp("osmUrl", e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={p.showMapsButton !== false}
                onChange={(e) => setProp("showMapsButton", e.target.checked)}
              />
              Show maps buttons
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={p.autoMapsButtons !== false}
                onChange={(e) => setProp("autoMapsButtons", e.target.checked)}
              />
              Auto-generate buttons from filled URLs
            </label>
            <LocalizedBlockInput block={block} field="mapsButtonText" label="Primary button text" />
            <SelectField
              label="Buttons layout"
              value={(p.mapsButtonsLayout as string) ?? "row"}
              onChange={(v) => setProp("mapsButtonsLayout", v)}
              options={[
                { value: "row", label: "Row" },
                { value: "stack", label: "Stack" },
                { value: "grid", label: "Grid" },
              ]}
            />
            <SelectField
              label="Buttons style"
              value={(p.mapsButtonsStyle as string) ?? "outline"}
              onChange={(v) => setProp("mapsButtonsStyle", v)}
              options={[
                { value: "outline", label: "Outline" },
                { value: "ghost", label: "Ghost" },
                { value: "filled", label: "Filled" },
                { value: "links", label: "Text links" },
              ]}
            />
          </div>
        </>
      }
    />
  );
}
