"use client";

import type { BlockNode } from "@/types/builder";
import type { GalleryBuilderOption } from "@/features/gallery/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { ItemCard, RepeatableSection } from "@/features/builder/blocks/content/admin/shared/repeatable-section";
import { LocalizedBlockTextarea, LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import { newId, type VideoGalleryItem } from "@/features/builder/blocks/media/schemas/media-blocks";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  galleryOptions?: GalleryBuilderOption[];
};

function emptyItem(): VideoGalleryItem {
  return {
    id: newId("vid"),
    videoUrl: "",
    videoMediaAssetId: "",
    embedUrl: "",
    thumbnailUrl: "",
    thumbnailMediaAssetId: "",
    playlistId: "",
    ...emptyLocalizedItemFields(["title", "category"]),
  } as VideoGalleryItem;
}

export function VideoGalleryBlockFields({ block, onChange, galleryOptions = [] }: Props) {
  const p = block.props;
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const items = (p.items as VideoGalleryItem[]) ?? [];
  const source = (p.source as string) ?? "inline";

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <div>
        <Label className="text-xs">Source</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={source} onChange={(e) => setProp("source", e.target.value)}>
          <option value="inline">Inline videos</option>
          <option value="album">Gallery album (videos only)</option>
        </select>
      </div>
      {source === "album" && (
        <div>
          <Label className="text-xs">Gallery album</Label>
          <select className="mt-1 flex h-9 w-full rounded-md border px-2 text-sm" value={(p.gallerySlug as string) ?? ""} onChange={(e) => setProp("gallerySlug", e.target.value)}>
            <option value="">Select album…</option>
            {galleryOptions.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.titleEn} ({g.slug})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            <Link href="/admin/gallery" className="underline">Manage galleries</Link>
          </p>
        </div>
      )}
      {source === "inline" && (
        <RepeatableSection label="Videos" onAdd={() => setProp("items", [...items, emptyItem()])} empty={items.length === 0}>
          {items.map((item, index) => (
            <ItemCard key={item.id} onRemove={() => setProp("items", items.filter((i) => i.id !== item.id))}>
              <Input placeholder="YouTube / Vimeo embed URL" className="h-8 text-sm" value={item.embedUrl} onChange={(e) => {
                const next = [...items];
                next[index] = { ...item, embedUrl: e.target.value };
                setProp("items", next);
              }} />
              <UrlPrimaryMediaPickerField
                label="Video file"
                mediaTypes={["VIDEO"]}
                url={item.videoUrl}
                onPick={({ url, mediaId }) => {
                  const next = [...items];
                  next[index] = { ...item, videoUrl: url, videoMediaAssetId: mediaId ?? "" };
                  setProp("items", next);
                }}
              />
              <UrlPrimaryMediaPickerField
                label="Thumbnail"
                mediaTypes={["IMAGE"]}
                url={item.thumbnailUrl}
                onPick={({ url, mediaId }) => {
                  const next = [...items];
                  next[index] = { ...item, thumbnailUrl: url, thumbnailMediaAssetId: mediaId ?? "" };
                  setProp("items", next);
                }}
              />
              <LocalizedItemFields
                fields={[
                  { key: "title", label: "Title" },
                  { key: "category", label: "Category" },
                ]}
                values={item as unknown as Record<string, string>}
                onChange={(patch) => {
                  const next = [...items];
                  next[index] = { ...item, ...patch };
                  setProp("items", next);
                }}
              />
            </ItemCard>
          ))}
        </RepeatableSection>
      )}
      <div>
        <Label className="text-xs">Columns</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={String(p.columns ?? 3)} onChange={(e) => setProp("columns", Number(e.target.value))}>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.enableLightbox !== false} onChange={(e) => setProp("enableLightbox", e.target.checked)} />
        Enable lightbox
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.showCategories === true} onChange={(e) => setProp("showCategories", e.target.checked)} />
        Category filters
      </label>
    </div>
  );
}
