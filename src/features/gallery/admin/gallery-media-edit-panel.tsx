"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { GalleryMediaAdmin } from "@/features/gallery/types";
import { upsertGalleryMedia } from "@/features/gallery/actions";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`mediaTitleEn-${item.id}`}>Title (EN)</Label>
          <Input id={`mediaTitleEn-${item.id}`} name="titleEn" defaultValue={item.titleEn} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`mediaTitleAr-${item.id}`}>Title (AR)</Label>
          <Input id={`mediaTitleAr-${item.id}`} name="titleAr" defaultValue={item.titleAr} required />
        </div>
      </div>

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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`mediaExcerptEn-${item.id}`}>Short description (EN)</Label>
          <Textarea id={`mediaExcerptEn-${item.id}`} name="excerptEn" rows={2} defaultValue={item.excerptEn ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`mediaExcerptAr-${item.id}`}>Short description (AR)</Label>
          <Textarea id={`mediaExcerptAr-${item.id}`} name="excerptAr" rows={2} defaultValue={item.excerptAr ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`mediaDescriptionEn-${item.id}`}>Description (EN)</Label>
          <Textarea
            id={`mediaDescriptionEn-${item.id}`}
            name="descriptionEn"
            rows={3}
            defaultValue={item.descriptionEn}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`mediaDescriptionAr-${item.id}`}>Description (AR)</Label>
          <Textarea
            id={`mediaDescriptionAr-${item.id}`}
            name="descriptionAr"
            rows={3}
            defaultValue={item.descriptionAr}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`mediaInfoEn-${item.id}`}>Info (EN)</Label>
          <Textarea id={`mediaInfoEn-${item.id}`} name="infoEn" rows={2} defaultValue={item.infoEn ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`mediaInfoAr-${item.id}`}>Info (AR)</Label>
          <Textarea id={`mediaInfoAr-${item.id}`} name="infoAr" rows={2} defaultValue={item.infoAr ?? ""} />
        </div>
      </div>

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
