"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { GalleryMediaAdmin } from "@/features/gallery/types";
import { upsertGalleryMedia } from "@/features/gallery/actions";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { Button } from "@/components/ui/button";

type Props = {
  item: GalleryMediaAdmin;
  galleryId: string;
  onClose: () => void;
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
};

export function GalleryMediaEditPanel({
  item,
  galleryId,
  onClose,
  embedded = false,
  formRef,
}: Props) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [mediaUrl, setMediaUrl] = useState(item.mediaUrl);
  const [mediaAssetId, setMediaAssetId] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<"IMAGE" | "VIDEO">(item.mediaKind);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!embedded || !formRef?.current || !adminForm) return;
    const form = formRef.current;
    const markDirty = () => adminForm.setDirty(true);
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
    };
  }, [embedded, formRef, adminForm]);

  const handleSubmit = (formData: FormData) => {
    formData.set("galleryId", galleryId);
    formData.set("mediaKind", mediaKind);
    if (mediaAssetId) formData.set("mediaAssetId", mediaAssetId);
    startTransition(async () => {
      await upsertGalleryMedia(formData);
      adminForm?.setDirty(false);
      adminForm?.showToast("Media saved", "success");
      router.refresh();
      onClose();
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
      className="mt-3 space-y-4 rounded-lg border bg-muted/30 p-4"
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
          adminForm?.setDirty(true);
          if (/\.(mp4|webm|mov|ogg)(\?|$)/i.test(url)) {
            setMediaKind("VIDEO");
          } else if (url) {
            setMediaKind("IMAGE");
          }
        }}
      />
      <input type="hidden" name="mediaAssetId" value={mediaAssetId ?? ""} readOnly />
      <input type="hidden" name="mediaUrl" value={mediaUrl} readOnly />

      <AdminLocalizedFormField fieldKey="excerpt" label="Short description" legacyEntity={item} multiline rows={2} />
      <AdminLocalizedFormField fieldKey="description" label="Description" legacyEntity={item} multiline rows={3} />
      <AdminLocalizedFormField fieldKey="info" label="Info" legacyEntity={item} multiline rows={2} />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={item.isPublished} />
        Published
      </label>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        {!embedded && (
          <Button type="submit" size="sm" disabled={pending || !mediaUrl}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        )}
      </div>
    </form>
  );
}
