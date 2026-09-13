"use client";

import { useState } from "react";
import { MediaPickerDialog } from "@/features/media/components/media-picker-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  title?: string;
  className?: string;
  accept?: string[];
  onSelect: (url: string) => void;
};

export function MediaPickerButton({
  label = "Choose image",
  title,
  className,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(className)}
        title={title}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={(asset) => {
          onSelect(asset.url);
          setOpen(false);
        }}
      />
    </>
  );
}
