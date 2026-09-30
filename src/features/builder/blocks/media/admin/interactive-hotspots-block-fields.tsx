"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { patchBlockMedia, patchBlockSettings } from "@/features/builder/instance/block-instance";
import { LocalizedBlockTextarea, LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import { newId, type HotspotItem } from "@/features/builder/blocks/media/schemas/media-blocks";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

function emptyHotspot(): HotspotItem {
  return {
    id: newId("hs"),
    x: 50,
    y: 50,
    href: "",
    mediaUrl: "",
    mediaAssetId: "",
    tooltipPlacement: "top",
    ...emptyLocalizedItemFields(["label", "content"]),
  } as HotspotItem;
}

function HotspotForm({
  item,
  onUpdate,
}: {
  item: HotspotItem;
  onUpdate: (patch: Partial<HotspotItem>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">X (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            className="mt-1 h-8 text-sm"
            value={item.x}
            onChange={(e) => onUpdate({ x: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Y (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            className="mt-1 h-8 text-sm"
            value={item.y}
            onChange={(e) => onUpdate({ y: Number(e.target.value) })}
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Tooltip placement</Label>
        <select
          className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
          value={item.tooltipPlacement ?? "top"}
          onChange={(e) => onUpdate({ tooltipPlacement: e.target.value as HotspotItem["tooltipPlacement"] })}
        >
          <option value="top">Top</option>
          <option value="right">Right</option>
          <option value="bottom">Bottom</option>
          <option value="left">Left</option>
        </select>
      </div>
      <LocalizedItemFields
        fields={[
          { key: "label", label: "Label" },
          { key: "content", label: "Content", multiline: true },
        ]}
        values={item as unknown as Record<string, string>}
        onChange={(patch) => onUpdate(patch as Partial<HotspotItem>)}
      />
      <div>
        <Label className="text-xs">Link URL (optional)</Label>
        <Input
          className="mt-1 h-8 text-sm"
          value={item.href}
          onChange={(e) => onUpdate({ href: e.target.value })}
        />
      </div>
    </div>
  );
}

export function InteractiveHotspotsBlockFields({ block, onChange }: Props) {
  const p = block.props;
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const hotspots = (p.hotspots as HotspotItem[]) ?? [];

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <UrlPrimaryMediaPickerField
        label="Base image"
        mediaTypes={["IMAGE"]}
        url={(p.imageUrl as string) ?? ""}
        onPick={({ url, mediaId }) =>
          onChange(
            patchBlockMedia(
              block,
              { urlKey: "imageUrl", mediaIdKey: "mediaAssetId" },
              { url, mediaId },
            ),
          )
        }
      />
      <div>
        <Label className="text-xs">Interaction</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(p.interaction as string) ?? "click"} onChange={(e) => setProp("interaction", e.target.value)}>
          <option value="click">Click</option>
          <option value="hover">Hover</option>
        </select>
      </div>
      <div>
        <Label className="text-xs">Panel style</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(p.panelStyle as string) ?? "popover"} onChange={(e) => setProp("panelStyle", e.target.value)}>
          <option value="tooltip">Tooltip</option>
          <option value="popover">Popover</option>
          <option value="drawer">Drawer (mobile-friendly)</option>
        </select>
      </div>
      <ModalRepeatableListEditor
        items={hotspots}
        onChange={(next) => setProp("hotspots", next)}
        createEmpty={emptyHotspot}
        strings={{
          sectionLabel: "Hotspots",
          addButtonLabel: "Add hotspot",
          emptyLabel: "No hotspots yet. Click Add hotspot to create one.",
          dialogTitleCreate: "Add hotspot",
          dialogTitleEdit: "Edit hotspot",
          saveButtonLabelCreate: "Save hotspot",
          saveButtonLabelEdit: "Save hotspot",
        }}
        renderSummary={(spot) => {
          const title = (spot.label as string | undefined)?.trim() || "Untitled hotspot";
          return { title, meta: [`X: ${spot.x}%`, `Y: ${spot.y}%`] };
        }}
        renderForm={(draft, onUpdate) => <HotspotForm item={draft} onUpdate={onUpdate} />}
      />
    </div>
  );
}
