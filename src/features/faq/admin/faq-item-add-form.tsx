"use client";

import { useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { upsertFaqItem } from "@/features/faq/actions";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { Button } from "@/components/ui/button";

type Props = {
  faqSetId: string;
  embedded?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
  onAfterAdd?: () => void;
};

export function FaqItemAddForm({ faqSetId, embedded = false, formRef, onAfterAdd }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    formData.set("faqSetId", faqSetId);
    formData.set("isPublished", "true");
    startTransition(async () => {
      await upsertFaqItem(formData);
      if (onAfterAdd) onAfterAdd();
      else router.refresh();
      formRef?.current?.reset();
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
      <AdminLocalizedFormField fieldKey="question" label="Question" required />
      <AdminLocalizedFormField fieldKey="answer" label="Answer" multiline rows={4} required />
      {!embedded ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add FAQ"}
        </Button>
      ) : null}
    </form>
  );
}
