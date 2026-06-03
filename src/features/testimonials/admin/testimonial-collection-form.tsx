"use client";

import { useEffect, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { TestimonialCollection } from "@prisma/client";
import { upsertTestimonialCollection } from "@/features/testimonials/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocaleTabPanel } from "@/features/translation/components/locale-tab-panel";

type Props = {
  collection?: TestimonialCollection | null;
  mode?: "create" | "edit";
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
};

export function TestimonialCollectionForm({
  collection,
  mode = collection ? "edit" : "create",
  embedded = false,
  formRef,
}: Props) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="titleEn">Title (EN)</Label>
          <Input id="titleEn" name="titleEn" defaultValue={collection?.titleEn ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="titleAr">Title (AR)</Label>
          <Input id="titleAr" name="titleAr" defaultValue={collection?.titleAr ?? ""} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={collection?.slug ?? ""} placeholder="auto-generated from title" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="excerptEn">Excerpt (EN)</Label>
          <Textarea id="excerptEn" name="excerptEn" rows={2} defaultValue={collection?.excerptEn ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="excerptAr">Excerpt (AR)</Label>
          <Textarea id="excerptAr" name="excerptAr" rows={2} defaultValue={collection?.excerptAr ?? ""} />
        </div>
      </div>

      {collection?.id ? (
        <LocaleTabPanel
          entityType="TestimonialCollection"
          entityId={collection.id}
          sourceData={{
            title: collection.titleEn ?? "",
            description: collection.excerptEn ?? "",
          }}
        />
      ) : null}

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
