"use client";

import type { BlockNode } from "@/types/builder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPickerField } from "@/features/media/components/media-picker-field";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";

type BackgroundKeys = {
  typeKey?: string;
  imageUrlKey?: string;
  imageMediaKey?: string;
  videoUrlKey?: string;
  colorKey?: string;
};

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  keys?: BackgroundKeys;
};

const DEFAULT_KEYS: Required<BackgroundKeys> = {
  typeKey: "backgroundType",
  imageUrlKey: "backgroundImageUrl",
  imageMediaKey: "backgroundMediaAssetId",
  videoUrlKey: "backgroundVideoUrl",
  colorKey: "backgroundColor",
};

export function BlockBackgroundSettings({ block, onChange, keys = {} }: Props) {
  const k = { ...DEFAULT_KEYS, ...keys };
  const p = block.props;
  const bgType = (p[k.typeKey!] as string) ?? "gradient";

  const setProp = (key: string, value: unknown) => {
    onChange(patchBlockSettings(block, { [key]: value }));
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Background</Label>
      <div>
        <Label className="text-xs">Type</Label>
        <select
          className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
          value={bgType}
          onChange={(e) => setProp(k.typeKey!, e.target.value)}
        >
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="gradient">Gradient</option>
          <option value="solid">Solid color</option>
          <option value="transparent">Transparent</option>
        </select>
      </div>
      {bgType === "image" && (
        <MediaPickerField
          label="Background image"
          mediaTypes={["IMAGE", "SVG"]}
          mediaId={(p[k.imageMediaKey!] as string) || null}
          url={(p[k.imageUrlKey!] as string) ?? ""}
          onChange={({ mediaId, url }) =>
            onChange(
              patchBlockSettings(block, {
                [k.imageUrlKey!]: url,
                [k.imageMediaKey!]: mediaId ?? "",
              })
            )
          }
        />
      )}
      {bgType === "video" && (
        <div>
          <Label className="text-xs">Video URL</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={(p[k.videoUrlKey!] as string) ?? ""}
            onChange={(e) => setProp(k.videoUrlKey!, e.target.value)}
            placeholder="https://..."
          />
        </div>
      )}
      {bgType === "solid" && (
        <div>
          <Label className="text-xs">Background color</Label>
          <Input
            className="mt-1 h-8 text-sm"
            value={(p[k.colorKey!] as string) ?? ""}
            onChange={(e) => setProp(k.colorKey!, e.target.value)}
            placeholder="#0f766e or hsl(...)"
          />
        </div>
      )}
    </div>
  );
}
