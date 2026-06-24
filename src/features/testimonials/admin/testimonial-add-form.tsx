"use client";

import { useEffect, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { upsertTestimonial } from "@/features/testimonials/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
  onSuccess?: () => void;
};

export function TestimonialAddForm({ embedded = false, formRef, onSuccess }: Props) {
  const router = useRouter();
  const adminForm = useAdminFormOptional();
  const [pending, startTransition] = useTransition();
  const [imageUrl, setImageUrl] = useState("");
  const [mediaAssetId, setMediaAssetId] = useState<string | null>(null);

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
    if (mediaAssetId) formData.set("mediaAssetId", mediaAssetId);
    if (imageUrl) formData.set("imageUrl", imageUrl);
    formData.set("isPublished", "true");
    startTransition(async () => {
      await upsertTestimonial(formData);
      adminForm?.setDirty(false);
      adminForm?.showToast("Testimonial added", "success");
      router.refresh();
      onSuccess?.();
      if (formRef?.current) formRef.current.reset();
      setImageUrl("");
      setMediaAssetId(null);
    });
  };

  return (
    <form
      ref={formRef}
      id="testimonial-add-form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rating">Rating</Label>
          <Input id="rating" name="rating" type="number" defaultValue={5} min={1} max={5} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="videoUrl">Video URL (optional)</Label>
          <Input id="videoUrl" name="videoUrl" />
        </div>
      </div>
      <AdminLocalizedFormField fieldKey="quote" label="Content" multiline rows={4} required />
      <UrlPrimaryMediaPickerField
        label="Photo"
        url={imageUrl}
        onChange={setImageUrl}
        onMediaIdChange={(mediaId) => setMediaAssetId(mediaId)}
      />
      <input type="hidden" name="imageUrl" value={imageUrl} readOnly />
      <input type="hidden" name="mediaAssetId" value={mediaAssetId ?? ""} readOnly />
      {!embedded && (
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add testimonial"}
        </Button>
      )}
    </form>
  );
}
