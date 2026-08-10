"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { EntityTranslation, Gallery } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { upsertGallery } from "@/features/gallery/actions";
import { legacyShapeFromTranslations } from "@/features/portal/lib/portal-translation-shape";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
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
  onAfterCreate?: (id: string) => void;
};

export function GalleryAlbumForm({
  album,
  locales: _locales,
  translations = [],
  mode = album ? "edit" : "create",
  embedded = false,
  formRef,
  onAfterCreate,
}: Props) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [coverUrl, setCoverUrl] = useState(album?.coverUrl ?? "");
  const [coverMediaId, setCoverMediaId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rawLegacy = legacyShapeFromTranslations(translations, [
    "title",
    "subtitle",
    "description",
    "info",
    "excerpt",
  ]);
  const legacy: Record<string, string> = {
    ...rawLegacy,
    excerptEn: rawLegacy.excerptEn ?? rawLegacy.subtitleEn ?? "",
    excerptAr: rawLegacy.excerptAr ?? rawLegacy.subtitleAr ?? "",
  };

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
        if (onAfterCreate) onAfterCreate(saved.id);
        else router.push(`/admin/gallery/${saved.id}`);
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

      <AdminLocalizedFormField
        fieldKey="title"
        label="Title"
        legacyEntity={legacy}
        entityType={album?.id ? "Gallery" : undefined}
        entityId={album?.id}
        required
      />
      <AdminLocalizedFormField
        fieldKey="excerpt"
        label="Excerpt"
        legacyEntity={legacy}
        entityType={album?.id ? "Gallery" : undefined}
        entityId={album?.id}
      />
      <AdminLocalizedFormField
        fieldKey="description"
        label="Description"
        legacyEntity={legacy}
        entityType={album?.id ? "Gallery" : undefined}
        entityId={album?.id}
      />

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
