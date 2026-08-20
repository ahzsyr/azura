"use client";

import type { BlockNode } from "@/types/builder";
import { Label } from "@/components/ui/label";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";
import { getBlockSettings, patchBlockMedia, patchBlockSettings } from "@/features/builder/instance/block-instance";
import {
  LocalizedBlockInput,
  LocalizedBlockTextarea,
  LocalizedBlockTitle,
} from "@/features/builder/block-translation-context";

type Props = { block: BlockNode; onChange: (block: BlockNode) => void };

export function ImageBlockFields({ block, onChange }: Props) {
  const imageProps = getBlockSettings(block);
  const align = (imageProps.align as string) === "start" ? "left" : ((imageProps.align as string) ?? "center");
  const descriptionAlign =
    (imageProps.descriptionAlign as string) === "start"
      ? "left"
      : ((imageProps.descriptionAlign as string) ?? "center");

  return (
    <div className="space-y-3">
      <UrlPrimaryMediaPickerField
        label="Image"
        mediaTypes={IMAGE_PICKER_MEDIA_TYPES}
        url={(imageProps.url as string) ?? ""}
        onPick={({ url, mediaId }) =>
          onChange(
            patchBlockMedia(
              block,
              { urlKey: "url", mediaIdKey: "mediaAssetId" },
              { url, mediaId },
            ),
          )
        }
      />
      <LocalizedBlockInput block={block} field="alt" label="Alt text" />
      <LocalizedBlockInput block={block} field="badge" label="Badge" />
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <LocalizedBlockTextarea block={block} field="description" label="Description" rows={3} />
      <div>
        <Label className="text-xs">Header alignment</Label>
        <select
          className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
          value={align}
          onChange={(e) => onChange(patchBlockSettings(block, { align: e.target.value }))}
        >
          <option value="center">Center</option>
          <option value="left">Left</option>
        </select>
      </div>
      <div className="rounded-md border p-3 space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Typography
        </Label>
        <div>
          <Label className="text-xs">Badge size</Label>
          <select
            className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
            value={(imageProps.badgeSize as string) ?? "sm"}
            onChange={(e) => onChange(patchBlockSettings(block, { badgeSize: e.target.value }))}
          >
            <option value="xs">XS</option>
            <option value="sm">SM</option>
            <option value="base">Base</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Title size</Label>
          <select
            className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
            value={(imageProps.titleSize as string) ?? "2xl"}
            onChange={(e) => onChange(patchBlockSettings(block, { titleSize: e.target.value }))}
          >
            <option value="xl">XL</option>
            <option value="2xl">2XL</option>
            <option value="3xl">3XL</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Subtitle size</Label>
          <select
            className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
            value={(imageProps.subtitleSize as string) ?? "base"}
            onChange={(e) => onChange(patchBlockSettings(block, { subtitleSize: e.target.value }))}
          >
            <option value="sm">SM</option>
            <option value="base">Base</option>
            <option value="lg">LG</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Description size</Label>
          <select
            className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
            value={(imageProps.descriptionSize as string) ?? "base"}
            onChange={(e) => onChange(patchBlockSettings(block, { descriptionSize: e.target.value }))}
          >
            <option value="sm">SM</option>
            <option value="base">Base</option>
            <option value="lg">LG</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Description alignment</Label>
          <select
            className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
            value={descriptionAlign}
            onChange={(e) => onChange(patchBlockSettings(block, { descriptionAlign: e.target.value }))}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
          </select>
        </div>
      </div>
    </div>
  );
}
