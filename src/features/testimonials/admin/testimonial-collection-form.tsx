"use client";

import { useEffect, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { EntityTranslation, TestimonialCollection } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { upsertTestimonialCollection } from "@/features/testimonials/actions";
import { legacyShapeFromTranslations } from "@/features/portal/lib/portal-translation-shape";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  collection?: TestimonialCollection | null;
  locales?: PublicLocale[];
  translations?: EntityTranslation[];
  mode?: "create" | "edit";
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
};

export function TestimonialCollectionForm({
  collection,
  locales = [],
  translations = [],
  mode = collection ? "edit" : "create",
  embedded = false,
  formRef,
}: Props) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [pending, startTransition] = useTransition();
  const rawLegacy = legacyShapeFromTranslations(translations, ["title", "subtitle", "description", "excerpt"]);
  const legacy: Record<string, string> = {
    ...rawLegacy,
    excerptEn: rawLegacy.excerptEn ?? rawLegacy.subtitleEn ?? rawLegacy.descriptionEn ?? "",
    excerptAr: rawLegacy.excerptAr ?? rawLegacy.subtitleAr ?? rawLegacy.descriptionAr ?? "",
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
    startTransition(async () => {
      const saved = await upsertTestimonialCollection(formData);
      adminForm?.setDirty(false);
      if (mode === "create") {
        router.push(`/admin/testimonials/collections/${saved.id}`);
      } else {
        adminForm?.showToast("Collection saved", "success");
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
      {collection && <input type="hidden" name="id" value={collection.id} />}
      <input type="hidden" name="sortOrder" value={collection?.sortOrder ?? 0} />

      <AdminLocalizedFormField
        fieldKey="title"
        label="Title"
        legacyEntity={legacy}
        entityType={collection?.id ? "TestimonialCollection" : undefined}
        entityId={collection?.id}
        required
      />
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={collection?.slug ?? ""} placeholder="auto-generated from title" />
      </div>
      <AdminLocalizedFormField
        fieldKey="excerpt"
        label="Excerpt"
        legacyEntity={legacy}
        entityType={collection?.id ? "TestimonialCollection" : undefined}
        entityId={collection?.id}
        multiline
        rows={2}
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isPublished"
          value="true"
          defaultChecked={collection?.isPublished ?? true}
        />
        Published
      </label>

      {!embedded && (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create collection" : "Save"}
        </Button>
      )}
    </form>
  );
}
