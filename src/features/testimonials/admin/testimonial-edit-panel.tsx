"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Testimonial } from "@prisma/client";
import { upsertTestimonial } from "@/features/testimonials/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TestimonialAdmin } from "@/features/testimonials/types";

type Props = {
  testimonial: Testimonial | TestimonialAdmin;
  embedded?: boolean;
  formRef?: React.RefObject<HTMLFormElement | null>;
};

export function TestimonialEditPanel({ testimonial, embedded, formRef }: Props) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [pending, startTransition] = useTransition();
  const [imageUrl, setImageUrl] = useState(testimonial.imageUrl ?? "");
  const [mediaAssetId, setMediaAssetId] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    formData.set("id", testimonial.id);
    if (mediaAssetId) formData.set("mediaAssetId", mediaAssetId);
    formData.set("imageUrl", imageUrl);
    startTransition(async () => {
      await upsertTestimonial(formData);
      adminForm?.setDirty(false);
      adminForm?.showToast("Testimonial saved", "success");
      router.refresh();
    });
  };

  const legacy =
    "contentEn" in testimonial
      ? {
          quoteEn: testimonial.contentEn,
          quoteAr: testimonial.contentAr,
        }
      : undefined;

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
      className="mt-4 space-y-4 border-t pt-4"
    >
      <input type="hidden" name="sortOrder" value={testimonial.sortOrder} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input name="name" defaultValue={testimonial.name} required />
        </div>
        <div className="space-y-2">
          <Label>Location</Label>
          <Input name="location" defaultValue={testimonial.location} required />
        </div>
        <div className="space-y-2">
          <Label>Rating</Label>
          <Input name="rating" type="number" defaultValue={testimonial.rating} min={1} max={5} />
        </div>
        <div className="space-y-2">
          <Label>Video URL</Label>
          <Input name="videoUrl" defaultValue={testimonial.videoUrl ?? ""} />
        </div>
      </div>
      <AdminLocalizedFormField
        fieldKey="quote"
        label="Content"
        legacyEntity={legacy}
        entityType="Testimonial"
        entityId={testimonial.id}
        multiline
        rows={3}
        required
      />
      <UrlPrimaryMediaPickerField
        label="Photo"
        url={imageUrl}
        onChange={setImageUrl}
        onMediaIdChange={(mediaId) => setMediaAssetId(mediaId)}
      />
      <input type="hidden" name="imageUrl" value={imageUrl} readOnly />
      <input type="hidden" name="mediaAssetId" value={mediaAssetId ?? ""} readOnly />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={testimonial.isPublished} />
        Published
      </label>
      {!embedded && (
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      )}
    </form>
  );
}
