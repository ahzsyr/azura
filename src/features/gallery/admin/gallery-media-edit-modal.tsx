"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GalleryMediaAdmin } from "@/features/gallery/types";
import { upsertGalleryMedia } from "@/features/gallery/actions";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  item: GalleryMediaAdmin | null;
  galleryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GalleryMediaEditModal({ item, galleryId, open, onOpenChange }: Props) {
  const router = useRouter();
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaAssetId, setMediaAssetId] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [pending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!item || !open) return;
    setMediaUrl(item.mediaUrl);
    setMediaAssetId(null);
    setMediaKind(item.mediaKind);
    setFormKey((k) => k + 1);
  }, [item, open]);

  const handleSubmit = (formData: FormData) => {
    if (!item) return;
    formData.set("galleryId", galleryId);
    formData.set("mediaKind", mediaKind);
    if (mediaAssetId) formData.set("mediaAssetId", mediaAssetId);
    startTransition(async () => {
      await upsertGalleryMedia(formData);
      router.refresh();
      onOpenChange(false);
    });
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit media</DialogTitle>
          <DialogDescription>Update title, media file, descriptions, and publish status.</DialogDescription>
        </DialogHeader>

        <form
          key={formKey}
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="sortOrder" value={item.sortOrder} />

          <AdminLocalizedFormField
            fieldKey="title"
            label="Title"
            legacyEntity={item}
            entityType="GalleryMedia"
            entityId={item.id}
            required
          />

          <UrlPrimaryMediaPickerField
            label="Photo or video"
            url={mediaUrl}
            mediaTypes={["IMAGE", "VIDEO", "SVG"]}
            onPick={({ url, mediaId }) => {
              setMediaAssetId(mediaId);
              setMediaUrl(url);
              if (/\.(mp4|webm|mov|ogg)(\?|$)/i.test(url)) {
                setMediaKind("VIDEO");
              } else if (url) {
                setMediaKind("IMAGE");
              }
            }}
          />
          <input type="hidden" name="mediaAssetId" value={mediaAssetId ?? ""} readOnly />
          <input type="hidden" name="mediaUrl" value={mediaUrl} readOnly />

          <AdminLocalizedFormField
            fieldKey="excerpt"
            label="Short description"
            legacyEntity={item}
            entityType="GalleryMedia"
            entityId={item.id}
            multiline
            rows={2}
          />
          <AdminLocalizedFormField
            fieldKey="description"
            label="Description"
            legacyEntity={item}
            entityType="GalleryMedia"
            entityId={item.id}
            multiline
            rows={3}
          />
          <AdminLocalizedFormField
            fieldKey="info"
            label="Info"
            legacyEntity={item}
            entityType="GalleryMedia"
            entityId={item.id}
            multiline
            rows={2}
          />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPublished" value="true" defaultChecked={item.isPublished} />
            Published
          </label>

          <DialogFooter className="px-0 pb-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !mediaUrl}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
