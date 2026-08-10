"use client";

import { useEffect, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { FaqItemAdmin } from "@/features/faq/types";
import { upsertFaqItem } from "@/features/faq/actions";
import { useAdminFormOptional } from "@/components/admin/layout/admin-form-provider";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { Button } from "@/components/ui/button";

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

  const legacy = {
    questionEn: item.questionEn,
    questionAr: item.questionAr,
    answerEn: item.answerEn,
    answerAr: item.answerAr,
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

      <AdminLocalizedFormField
        fieldKey="question"
        label="Question"
        legacyEntity={legacy}
        entityType="FaqItem"
        entityId={item.id}
        required
      />
      <AdminLocalizedFormField
        fieldKey="answer"
        label="Answer"
        legacyEntity={legacy}
        entityType="FaqItem"
        entityId={item.id}
        multiline
        rows={4}
        required
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
