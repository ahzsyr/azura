"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicLocale } from "@/i18n/locale-config";
import { GalleryAlbumForm } from "./gallery-album-form";
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

export function GalleryCreateModal({ open, onOpenChange, locales }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [formKey, setFormKey] = useState(0);

  const handleOpenChange = (next: boolean) => {
    if (next) setFormKey((k) => k + 1);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New gallery</DialogTitle>
          <DialogDescription>
            Create a gallery album, then add photos and videos on the edit screen.
          </DialogDescription>
        </DialogHeader>

        <GalleryAlbumForm
          key={formKey}
          mode="create"
          embedded
          formRef={formRef}
          locales={locales}
          onAfterCreate={(id) => {
            onOpenChange(false);
            router.push(`/admin/gallery/${id}`);
          }}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => formRef.current?.requestSubmit()}>
            Create gallery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
