"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import type { MediaType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ImagePlus } from "lucide-react";
import { UnifiedResourcePickerDialog } from "./unified-resource-picker-dialog";

export type UnifiedMediaPickResult = {
  url: string;
  mediaId: string | null;
  source: "cms" | "site";
  filename?: string;
};

type Props = {
  trigger?: ReactNode;
  mediaTypes?: MediaType[];
  onSelect: (result: UnifiedMediaPickResult) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultSource?: "cms" | "site";
  /** When false, only CMS (database + cloud storage) media is offered. */
  showSiteFilesystem?: boolean;
};

export function UnifiedMediaPickerDialog({
  trigger,
  mediaTypes,
  onSelect,
  open: controlledOpen,
  onOpenChange,
  defaultSource = "cms",
  showSiteFilesystem = process.env.NEXT_PUBLIC_CATALOG_DB_ONLY !== "1",
}: Props) {
  return (
    <UnifiedResourcePickerDialog
      trigger={trigger}
      allowedTypes={["media"]}
      mediaTypes={mediaTypes}
      open={controlledOpen}
      onOpenChange={onOpenChange}
      defaultSource={defaultSource}
      showSiteFilesystem={showSiteFilesystem}
      onSelect={(result) => {
        if (result.type !== "media") return;
        onSelect(result);
      }}
    />
  );
}

export const UnifiedMediaPickerTriggerButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof Button> & { label?: string }
>(function UnifiedMediaPickerTriggerButton(
  { label = "Media library", children, ...props },
  ref
) {
  return (
    <Button ref={ref} type="button" variant="outline" size="sm" {...props}>
      <ImagePlus className="h-4 w-4 me-1" />
      {children ?? label}
    </Button>
  );
});
UnifiedMediaPickerTriggerButton.displayName = "UnifiedMediaPickerTriggerButton";
