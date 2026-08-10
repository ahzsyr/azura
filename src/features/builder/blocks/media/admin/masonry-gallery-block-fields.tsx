"use client";

import type { BlockNode } from "@/types/builder";
import type { GalleryBuilderOption } from "@/features/gallery/types";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { patchBlockSettings } from "@/features/builder/instance/block-instance";
import { ModalRepeatableListEditor } from "@/features/builder/admin/shared/modal-repeatable-list-editor";
import { LocalizedBlockTextarea, LocalizedBlockTitle } from "@/features/builder/block-translation-context";
import {
  emptyLocalizedItemFields,
  LocalizedItemFields,
} from "@/features/builder/blocks/marketing/admin/localized-item-fields";
import { newId, type MasonryGalleryItem } from "@/features/builder/blocks/media/schemas/media-blocks";

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
        <ModalRepeatableListEditor
          items={items}
          onChange={(next) => setProp("items", next)}
          createEmpty={emptyItem}
          strings={{
            sectionLabel: "Media items",
            addButtonLabel: "Add item",
            emptyLabel: "No media items yet. Click Add item to create one.",
            dialogTitleCreate: "Add media item",
            dialogTitleEdit: "Edit media item",
            saveButtonLabelCreate: "Save item",
            saveButtonLabelEdit: "Save item",
          }}
          renderSummary={(item, index) => ({
            title: ((item.caption as string | undefined) ?? "").trim() || `Item ${index + 1}`,
            meta: [item.mediaKind, item.category ? `Category: ${item.category}` : ""].filter(Boolean),
          })}
          renderForm={(draft, onUpdate) => (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Type</Label>
                <select
                  className="mt-1 w-full rounded-md border h-9 px-2 text-sm"
                  value={draft.mediaKind}
                  onChange={(e) => onUpdate({ mediaKind: e.target.value as "IMAGE" | "VIDEO" })}
                >
                  <option value="IMAGE">Image</option>
                  <option value="VIDEO">Video</option>
                </select>
              </div>
              {draft.mediaKind === "IMAGE" ? (
                <UrlPrimaryMediaPickerField
                  label="Image"
                  mediaTypes={["IMAGE"]}
                  url={draft.imageUrl}
                  onPick={({ url, mediaId }) => onUpdate({ imageUrl: url, mediaAssetId: mediaId ?? "" })}
                />
              ) : (
                <UrlPrimaryMediaPickerField
                  label="Video"
                  mediaTypes={["VIDEO"]}
                  url={draft.videoUrl}
                  onPick={({ url, mediaId }) => onUpdate({ videoUrl: url, mediaAssetId: mediaId ?? "" })}
                />
              )}
              <LocalizedItemFields
                fields={[
                  { key: "alt", label: "Alt" },
                  { key: "caption", label: "Caption" },
                  { key: "category", label: "Category" },
                ]}
                values={draft as unknown as Record<string, string>}
                onChange={(patch) => onUpdate(patch as Partial<MasonryGalleryItem>)}
              />
            </div>
          )}
        />
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
