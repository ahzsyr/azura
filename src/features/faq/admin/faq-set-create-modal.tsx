"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicLocale } from "@/i18n/locale-config";
import { FaqSetForm } from "./faq-set-form";
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
  locales: PublicLocale[];
};

export function FaqSetCreateModal({ open, onOpenChange, locales }: Props) {
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
          <DialogTitle>New FAQ set</DialogTitle>
          <DialogDescription>
            Create an FAQ collection, then add questions on the next screen.
          </DialogDescription>
        </DialogHeader>

        <FaqSetForm
          key={formKey}
          mode="create"
          embedded
          formRef={formRef}
          locales={locales}
          onAfterCreate={(id) => {
            onOpenChange(false);
            router.push(`/admin/faqs/${id}`);
          }}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => formRef.current?.requestSubmit()}>
            Create FAQ set
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
