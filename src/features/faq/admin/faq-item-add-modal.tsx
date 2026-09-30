"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaqItemAddForm } from "./faq-item-add-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faqSetId: string;
};

export function FaqItemAddModal({ open, onOpenChange, faqSetId }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);

  const handleOpenChange = (next: boolean) => {
    if (next) setFormKey((k) => k + 1);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add FAQ</DialogTitle>
          <DialogDescription>Add a new question and answer to this set.</DialogDescription>
        </DialogHeader>

        <FaqItemAddForm
          key={formKey}
          faqSetId={faqSetId}
          embedded
          formRef={formRef}
          onAfterAdd={() => {
            onOpenChange(false);
            router.refresh();
          }}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => formRef.current?.requestSubmit()}>
            Add FAQ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
