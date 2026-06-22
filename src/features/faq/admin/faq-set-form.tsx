"use client";

import { useEffect, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { EntityTranslation, FaqSet } from "@prisma/client";
import type { PublicLocale } from "@/i18n/locale-config";
import { upsertFaqSet } from "@/features/faq/actions";
import { legacyShapeFromTranslations } from "@/features/portal/lib/portal-translation-shape";
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
};

export function FaqSetForm({
  faqSet,
  locales,
  translations = [],
  mode = faqSet ? "edit" : "create",
  embedded = false,
  formRef,
}: Props) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [pending, startTransition] = useTransition();
  const rawLegacy = legacyShapeFromTranslations(translations, ["title", "subtitle", "description", "excerpt"]);
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
    startTransition(async () => {
      const saved = await upsertFaqSet(formData);
      adminForm?.setDirty(false);
      if (mode === "create") {
        router.push(`/admin/faqs/${saved.id}`);
      } else {
        adminForm?.showToast("FAQ set saved", "success");
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
      {faqSet && <input type="hidden" name="id" value={faqSet.id} />}
      <input type="hidden" name="sortOrder" value={faqSet?.sortOrder ?? 0} />

      <AdminLocalizedFormField
        fieldKey="title"
        label="Title"
        legacyEntity={legacy}
        entityType={faqSet?.id ? "FaqSet" : undefined}
        entityId={faqSet?.id}
        required
      />
      <AdminLocalizedFormField
        fieldKey="description"
        label="Description"
        legacyEntity={legacy}
        entityType={faqSet?.id ? "FaqSet" : undefined}
        entityId={faqSet?.id}
      />

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={faqSet?.slug ?? ""} placeholder="auto-generated from title" />
      </div>

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
