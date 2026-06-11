"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { patchBlockMedia, patchBlockSettings } from "@/features/builder/instance/block-instance";
import { ItemCard, RepeatableSection } from "@/features/content-blocks/admin/shared/repeatable-section";
import { LocalizedBlockTextarea, LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
} from "@/features/marketing-blocks/admin/localized-item-fields";
import { newId, type HotspotItem } from "@/features/media-blocks/schemas/media-blocks";

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
      <RepeatableSection label="Hotspots" onAdd={() => setProp("hotspots", [...hotspots, emptyHotspot()])} empty={hotspots.length === 0}>
        {hotspots.map((spot, index) => (
          <ItemCard key={spot.id} onRemove={() => setProp("hotspots", hotspots.filter((h) => h.id !== spot.id))}>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">X (%)</Label>
                <Input type="number" min={0} max={100} className="mt-1 h-8 text-sm" value={spot.x} onChange={(e) => {
                  const next = [...hotspots];
                  next[index] = { ...spot, x: Number(e.target.value) };
                  setProp("hotspots", next);
                }} />
              </div>
              <div>
                <Label className="text-xs">Y (%)</Label>
                <Input type="number" min={0} max={100} className="mt-1 h-8 text-sm" value={spot.y} onChange={(e) => {
                  const next = [...hotspots];
                  next[index] = { ...spot, y: Number(e.target.value) };
                  setProp("hotspots", next);
                }} />
              </div>
            </div>
            <LocalizedItemFields
              fields={[
                { key: "label", label: "Label" },
                { key: "content", label: "Content", multiline: true },
              ]}
              values={spot as unknown as Record<string, string>}
              onChange={(patch) => {
                const next = [...hotspots];
                next[index] = { ...spot, ...patch };
                setProp("hotspots", next);
              }}
            />
            <Input placeholder="Link URL (optional)" className="h-8 text-sm" value={spot.href} onChange={(e) => {
              const next = [...hotspots];
              next[index] = { ...spot, href: e.target.value };
              setProp("hotspots", next);
            }} />
          </ItemCard>
        ))}
      </RepeatableSection>
    </div>
  );
}
