"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { patchBlockMedia, patchBlockSettings } from "@/features/builder/instance/block-instance";
import { LocalizedBlockInput, LocalizedBlockTextarea, LocalizedBlockTitle } from "@/features/builder/block-translation-context";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

export function BeforeAfterBlockFields({ block, onChange }: Props) {
  const p = block.props;
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <div>
        <Label className="text-xs">Layout</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={(p.layout as string) ?? "slider"} onChange={(e) => setProp("layout", e.target.value)}>
          <option value="slider">Interactive slider</option>
          <option value="sideBySide">Side by side</option>
          <option value="stacked">Stacked</option>
          <option value="overlay">Overlay (hover / tap)</option>
        </select>
      </div>
      <LocalizedBlockInput block={block} field="beforeLabel" label="Before label" />
      <LocalizedBlockInput block={block} field="afterLabel" label="After label" />
      <UrlPrimaryMediaPickerField
        label="Before image"
        mediaTypes={["IMAGE"]}
        url={(p.beforeImageUrl as string) ?? ""}
        onPick={({ url, mediaId }) =>
          onChange(
            patchBlockMedia(
              block,
              { urlKey: "beforeImageUrl", mediaIdKey: "beforeMediaAssetId" },
              { url, mediaId },
            ),
          )
        }
      />
      <UrlPrimaryMediaPickerField
        label="After image"
        mediaTypes={["IMAGE"]}
        url={(p.afterImageUrl as string) ?? ""}
        onPick={({ url, mediaId }) =>
          onChange(
            patchBlockMedia(
              block,
              { urlKey: "afterImageUrl", mediaIdKey: "afterMediaAssetId" },
              { url, mediaId },
            ),
          )
        }
      />
      {p.layout === "slider" && (
        <div>
          <Label className="text-xs">Initial slider position (0–100)</Label>
          <Input type="number" min={0} max={100} className="mt-1 h-8 text-sm" value={(p.sliderPosition as number) ?? 50} onChange={(e) => setProp("sliderPosition", Number(e.target.value))} />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.showLabels !== false} onChange={(e) => setProp("showLabels", e.target.checked)} />
        Show labels
      </label>
    </div>
  );
}
