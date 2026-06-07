"use client";

import type { BlockNode } from "@/types/builder";
import type { GalleryBuilderOption } from "@/features/gallery/types";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { MediaPickerField } from "@/features/media/components/media-picker-field";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { ItemCard, RepeatableSection } from "@/features/content-blocks/admin/shared/repeatable-section";
import { LocalizedBlockTextarea, LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
} from "@/features/marketing-blocks/admin/localized-item-fields";
import { newId, type MasonryGalleryItem } from "@/features/media-blocks/schemas/media-blocks";

type Props = {
  block: BlockNode;
  onChange: (block: BlockNode) => void;
  galleryOptions?: GalleryBuilderOption[];
};

function emptyItem(): MasonryGalleryItem {
  return {
    id: newId("mg"),
    imageUrl: "",
    mediaAssetId: "",
    videoUrl: "",
    mediaKind: "IMAGE",
    ...emptyLocalizedItemFields(["alt", "caption", "category"]),
  } as MasonryGalleryItem;
}

export function MasonryGalleryBlockFields({ block, onChange, galleryOptions = [] }: Props) {
  const p = block.props;
  const setProp = (key: string, value: unknown) => onChange(patchBlockSettings(block, { [key]: value }));
  const items = (p.items as MasonryGalleryItem[]) ?? [];
  const source = (p.source as string) ?? "inline";

  return (
    <div className="space-y-3">
      <LocalizedBlockTitle block={block} />
      <LocalizedBlockTextarea block={block} field="subtitle" label="Subtitle" rows={2} />
      <div>
        <Label className="text-xs">Source</Label>
        <select className="mt-1 w-full rounded-md border h-9 px-2 text-sm" value={source} onChange={(e) => setProp("source", e.target.value)}>
          <option value="inline">Inline items</option>
          <option value="album">Gallery album</option>
        </select>
      </div>
      {source === "album" && (
        <div>
          <Label className="text-xs">Gallery album</Label>
          <select className="mt-1 flex h-9 w-full rounded-md border px-2 text-sm" value={(p.gallerySlug as string) ?? ""} onChange={(e) => setProp("gallerySlug", e.target.value)}>
            <option value="">Select album…</option>
            {galleryOptions.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.titleEn} ({g.slug}) — {g.mediaCount} items
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            <Link href="/admin/gallery" className="underline">Manage galleries</Link>
          </p>
        </div>
      )}
      {source === "inline" && (
        <RepeatableSection label="Media items" onAdd={() => setProp("items", [...items, emptyItem()])} empty={items.length === 0}>
          {items.map((item, index) => (
            <ItemCard key={item.id} onRemove={() => setProp("items", items.filter((i) => i.id !== item.id))}>
              <div>
                <Label className="text-xs">Type</Label>
                <select
                  className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
                  value={item.mediaKind}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = { ...item, mediaKind: e.target.value as "IMAGE" | "VIDEO" };
                    setProp("items", next);
                  }}
                >
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                </select>
              </div>
              {item.mediaKind === "IMAGE" ? (
                <MediaPickerField
                  label="Image"
                  mediaTypes={["IMAGE"]}
                  mediaId={item.mediaAssetId || null}
                  url={item.imageUrl}
                  onChange={({ mediaId, url }) => {
                    const next = [...items];
                    next[index] = { ...item, imageUrl: url, mediaAssetId: mediaId ?? "" };
                    setProp("items", next);
                  }}
                />
              ) : (
                <MediaPickerField
                  label="Video"
                  mediaTypes={["VIDEO"]}
                  mediaId={item.mediaAssetId || null}
                  url={item.videoUrl}
                  onChange={({ mediaId, url }) => {
                    const next = [...items];
                    next[index] = { ...item, videoUrl: url, mediaAssetId: mediaId ?? "" };
                    setProp("items", next);
                  }}
                />
              )}
              <LocalizedItemFields
                fields={[
                  { key: "alt", label: "Alt" },
                  { key: "caption", label: "Caption" },
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
        Lightbox
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.enableFilter === true} onChange={(e) => setProp("enableFilter", e.target.checked)} />
        Category filter
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.lazyLoad !== false} onChange={(e) => setProp("lazyLoad", e.target.checked)} />
        Lazy load
      </label>
    </div>
  );
}
