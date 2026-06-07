"use client";

import { useEffect, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { FaqItemAdmin } from "@/features/faq/types";
import { upsertFaqItem } from "@/features/faq/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocaleTabPanel } from "@/features/translation/components/locale-tab-panel";

type Props = {
  item: FaqItemAdmin;
  faqSetId: string;
  onClose: () => void;
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
};

export function FaqItemEditPanel({
  item,
  faqSetId,
  onClose,
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
    formData.set("faqSetId", faqSetId);
    startTransition(async () => {
      await upsertFaqItem(formData);
      adminForm?.setDirty(false);
      adminForm?.showToast("FAQ saved", "success");
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
          <Label htmlFor={`questionEn-${item.id}`}>Question (EN)</Label>
          <Input id={`questionEn-${item.id}`} name="questionEn" defaultValue={item.questionEn} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`questionAr-${item.id}`}>Question (AR)</Label>
          <Input id={`questionAr-${item.id}`} name="questionAr" defaultValue={item.questionAr} required />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`answerEn-${item.id}`}>Answer (EN)</Label>
          <Textarea id={`answerEn-${item.id}`} name="answerEn" rows={4} defaultValue={item.answerEn} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`answerAr-${item.id}`}>Answer (AR)</Label>
          <Textarea id={`answerAr-${item.id}`} name="answerAr" rows={4} defaultValue={item.answerAr} required />
        </div>
      </div>

      <LocaleTabPanel
        entityType="FaqItem"
        entityId={item.id}
        sourceData={{
          question: item.questionEn,
          answer: item.answerEn,
        }}
      />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPublished" value="true" defaultChecked={item.isPublished} />
        Published
      </label>

      {!embedded && (
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      )}
    </form>
  );
}
