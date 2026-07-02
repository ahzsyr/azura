"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertFaqItem } from "@/features/faq/actions";
import { AdminLocalizedFormField } from "@/features/translation/components/admin-localized-form-field";
import { Button } from "@/components/ui/button";

type Props = {
  faqSetId: string;
};

export function FaqItemAddForm({ faqSetId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    formData.set("faqSetId", faqSetId);
    formData.set("isPublished", "true");
    startTransition(async () => {
      await upsertFaqItem(formData);
      router.refresh();
      (document.getElementById("faq-item-add-form") as HTMLFormElement)?.reset();
    });
  };

  return (
    <form
      id="faq-item-add-form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
      className="space-y-4"
    >
      <AdminLocalizedFormField fieldKey="question" label="Question" required />
      <AdminLocalizedFormField fieldKey="answer" label="Answer" multiline rows={4} required />
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add FAQ"}
      </Button>
    </form>
  );
}
