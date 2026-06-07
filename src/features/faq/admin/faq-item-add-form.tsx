"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertFaqItem } from "@/features/faq/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="addQuestionEn">Question (EN)</Label>
          <Input id="addQuestionEn" name="questionEn" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="addQuestionAr">Question (AR)</Label>
          <Input id="addQuestionAr" name="questionAr" required />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="addAnswerEn">Answer (EN)</Label>
          <Textarea id="addAnswerEn" name="answerEn" rows={4} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="addAnswerAr">Answer (AR)</Label>
          <Textarea id="addAnswerAr" name="answerAr" rows={4} required />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add FAQ"}
      </Button>
    </form>
  );
}
