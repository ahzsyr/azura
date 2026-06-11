"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { EntityTranslation, Gallery } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { upsertGallery } from "@/features/gallery/actions";
import { LocaleTabPanel } from "@/features/translation/components/locale-tab-panel";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  album?: Gallery | null;
  locales: PublicLocale[];
  translations?: EntityTranslation[];
  mode?: "create" | "edit";
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
};

export function GalleryAlbumForm({
  album,
  locales: _locales,
  translations: _translations = [],
  mode = album ? "edit" : "create",
  embedded = false,
  formRef,
}: Props) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [coverUrl, setCoverUrl] = useState(album?.coverUrl ?? "");
  const [coverMediaId, setCoverMediaId] = useState<string | null>(null);
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
    if (coverMediaId) formData.set("coverMediaAssetId", coverMediaId);
    startTransition(async () => {
      const saved = await upsertGallery(formData);
      adminForm?.setDirty(false);
      if (mode === "create") {
        router.push(`/admin/gallery/${saved.id}`);
      } else {
        adminForm?.showToast("Gallery saved", "success");
        router.refresh();
      }
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
      className="space-y-4"
    >
      {album && <input type="hidden" name="id" value={album.id} />}
      <input type="hidden" name="sortOrder" value={album?.sortOrder ?? 0} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="titleEn">Title (EN)</Label>
          <Input id="titleEn" name="titleEn" defaultValue={album?.titleEn ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="titleAr">Title (AR)</Label>
          <Input id="titleAr" name="titleAr" defaultValue={album?.titleAr ?? ""} required />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="excerptEn">Excerpt (EN)</Label>
          <Input id="excerptEn" name="excerptEn" defaultValue={album?.excerptEn ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="excerptAr">Excerpt (AR)</Label>
          <Input id="excerptAr" name="excerptAr" defaultValue={album?.excerptAr ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="descriptionEn">Description (EN)</Label>
          <Input id="descriptionEn" name="descriptionEn" defaultValue={album?.descriptionEn ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="descriptionAr">Description (AR)</Label>
          <Input id="descriptionAr" name="descriptionAr" defaultValue={album?.descriptionAr ?? ""} />
        </div>
      </div>

      {album?.id ? (
        <LocaleTabPanel
          entityType="Gallery"
          entityId={album.id}
          sourceData={{
            title: album.titleEn ?? "",
            excerpt: album.excerptEn ?? "",
            description: album.descriptionEn ?? "",
            info: album.infoEn ?? "",
          }}
        />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={album?.slug ?? ""} placeholder="auto-generated from title" />
      </div>

      <UrlPrimaryMediaPickerField
        label="Cover image"
        url={coverUrl}
        onChange={(url) => setCoverUrl(url ?? "")}
        onMediaIdChange={(mediaId) => setCoverMediaId(mediaId)}
      />
      <input type="hidden" name="coverMediaAssetId" value={coverMediaId ?? ""} readOnly />
      <input type="hidden" name="coverUrl" value={coverUrl} readOnly />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={album?.isPublished ?? true} />
        Published
      </label>

      {!embedded ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create gallery" : "Save changes"}
        </Button>
      ) : null}
    </form>
  );
}
