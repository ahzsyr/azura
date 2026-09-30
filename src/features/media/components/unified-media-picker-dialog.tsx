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
  source: "cms" | "site" | "icons";
  filename?: string;
};

type AllowedType = "media" | "icons";

type Props = {
  trigger?: ReactNode;
  mediaTypes?: MediaType[];
  onSelect: (result: UnifiedMediaPickResult) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultSource?: "cms" | "site" | "icons";
  /** When false, only CMS (database + cloud storage) media is offered. */
  showSiteFilesystem?: boolean;
  /** Include the Icons library tab alongside CMS/Site media. */
  allowedTypes?: AllowedType[];
};

export function UnifiedMediaPickerDialog({
  trigger,
  mediaTypes,
  onSelect,
  open: controlledOpen,
  onOpenChange,
  defaultSource = "cms",
  showSiteFilesystem = process.env.NEXT_PUBLIC_CATALOG_DB_ONLY !== "1",
  allowedTypes = ["media"],
}: Props) {
  return (
    <UnifiedResourcePickerDialog
      trigger={trigger}
      allowedTypes={allowedTypes}
      mediaTypes={mediaTypes}
      open={controlledOpen}
      onOpenChange={onOpenChange}
      defaultSource={defaultSource}
      showSiteFilesystem={showSiteFilesystem}
      onSelect={(result) => {
        if (result.type === "media") {
          onSelect(result);
          return;
        }
        onSelect({
          url: result.iconId,
          mediaId: null,
          source: "icons",
          filename: result.iconId,
        });
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
