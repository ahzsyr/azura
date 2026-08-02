"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { EntityTranslation, FaqSet } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { upsertFaqSet } from "@/features/faq/actions";
import { legacyShapeFromTranslations } from "@/features/portal/lib/portal-translation-shape";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  faqSet?: FaqSet | null;
  locales: PublicLocale[];
  translations?: EntityTranslation[];
  mode?: "create" | "edit";
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
  onAfterCreate?: (id: string) => void;
};

export function FaqSetForm({
  faqSet,
  locales: _locales,
  translations = [],
  mode = faqSet ? "edit" : "create",
  embedded = false,
  formRef,
  onAfterCreate,
}: Props) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [coverUrl, setCoverUrl] = useState(faqSet?.coverUrl ?? "");
  const [coverMediaId, setCoverMediaId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rawLegacy = legacyShapeFromTranslations(translations, ["title", "subtitle", "description", "excerpt"]);
  const legacy: Record<string, string> = {
    ...rawLegacy,
    excerptEn: rawLegacy.excerptEn ?? rawLegacy.subtitleEn ?? "",
    excerptAr: rawLegacy.excerptAr ?? rawLegacy.subtitleAr ?? "",
  };

  useEffect(() => {
    setCoverUrl(faqSet?.coverUrl ?? "");
  }, [faqSet?.coverUrl]);

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

  const handleCoverChange = (url: string) => {
    setCoverUrl(url ?? "");
    adminForm?.setDirty(true);
  };

  const handleSubmit = (formData: FormData) => {
    if (coverMediaId) formData.set("coverMediaAssetId", coverMediaId);
    startTransition(async () => {
      try {
        const result = await upsertFaqSet(formData);
        if (!result.ok) {
          adminForm?.showToast(result.error.slice(0, 200), "error");
          return;
        }

        adminForm?.setDirty(false);
        if (mode === "create") {
          if (onAfterCreate) onAfterCreate(result.faqSet.id);
          else router.push(`/admin/faqs/${result.faqSet.id}`);
        } else {
          adminForm?.showToast(
            result.wroteCoverUrl
              ? "FAQ set saved"
              : "FAQ set saved (cover image skipped — run DB migration for coverUrl)",
            "success",
          );
          router.refresh();
        }
      } catch (error) {
        adminForm?.showToast(
          error instanceof Error ? error.message.slice(0, 200) : "Failed to save FAQ set",
          "error",
        );
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
      {faqSet && <input type="hidden" name="id" value={faqSet.id} />}
      <input type="hidden" name="sortOrder" value={faqSet?.sortOrder ?? 0} />

      <AdminLocalizedFormField
        fieldKey="title"
        label="Title"
        legacyEntity={legacy}
        entityType={faqSet?.id ? "FaqSet" : undefined}
        entityId={faqSet?.id}
        initialTranslations={faqSet?.id ? translations : undefined}
        required
      />
      <AdminLocalizedFormField
        fieldKey="excerpt"
        label="Excerpt"
        legacyEntity={legacy}
        entityType={faqSet?.id ? "FaqSet" : undefined}
        entityId={faqSet?.id}
        initialTranslations={faqSet?.id ? translations : undefined}
      />
      <AdminLocalizedFormField
        fieldKey="description"
        label="Description"
        legacyEntity={legacy}
        entityType={faqSet?.id ? "FaqSet" : undefined}
        entityId={faqSet?.id}
        initialTranslations={faqSet?.id ? translations : undefined}
      />

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={faqSet?.slug ?? ""} placeholder="auto-generated from title" />
      </div>

      <UrlPrimaryMediaPickerField
        label="Cover image"
        url={coverUrl}
        onChange={handleCoverChange}
        onMediaIdChange={(mediaId) => {
          setCoverMediaId(mediaId);
          adminForm?.setDirty(true);
        }}
      />
      <input type="hidden" name="coverMediaAssetId" value={coverMediaId ?? ""} readOnly />
      <input type="hidden" name="coverUrl" value={coverUrl} readOnly />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={faqSet?.isPublished ?? true} />
        Published
      </label>

      {!embedded ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create FAQ set" : "Save changes"}
        </Button>
      ) : null}
    </form>
  );
}
