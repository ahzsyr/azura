"use client";

import {
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useState,
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type ReactElement,
} from "react";
import type { MediaType } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImagePlus } from "lucide-react";
import { CmsMediaPickerPanel } from "./cms-media-picker-panel";

export type MediaPickResult = {
  id: string;
  url: string;
  filename: string;
  mediaType: MediaType;
  altEn: string;
  altAr: string;
};

type Props = {
  trigger?: React.ReactNode;
  mediaTypes?: MediaType[];
  onSelect?: (asset: MediaPickResult) => void;
  onSelectMultiple?: (assets: MediaPickResult[]) => void;
  multi?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function MediaPickerDialog({
  trigger,
  mediaTypes,
  onSelect,
  onSelectMultiple,
  multi = false,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const openPicker = useCallback(() => {
    handleOpenChange(true);
  }, [handleOpenChange]);

  const handleSelect = useCallback(
    (asset: MediaPickResult) => {
      onSelect?.(asset);
      handleOpenChange(false);
    },
    [onSelect, handleOpenChange]
  );

  const handleSelectMultiple = useCallback(
    (assets: MediaPickResult[]) => {
      onSelectMultiple?.(assets);
      handleOpenChange(false);
    },
    [onSelectMultiple, handleOpenChange]
  );

  type TriggerProps = { onClick?: (e: MouseEvent) => void };
  const triggerNode =
    trigger && isValidElement(trigger)
      ? cloneElement(trigger as ReactElement<TriggerProps>, {
          onClick: (e: MouseEvent) => {
            (trigger as ReactElement<TriggerProps>).props.onClick?.(e);
            if (!e.defaultPrevented) openPicker();
          },
        })
      : null;

  return (
    <>
      {triggerNode}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Media library</DialogTitle>
            <DialogDescription>
              {multi
                ? "Select one or more assets, then click Add selected."
                : "Search and select an asset from your media library."}
            </DialogDescription>
          </DialogHeader>
          <CmsMediaPickerPanel
            mediaTypes={mediaTypes}
            onSelect={handleSelect}
            onSelectMultiple={handleSelectMultiple}
            multi={multi}
            active={open}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export const MediaPickerTriggerButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof Button> & { label?: string }
>(function MediaPickerTriggerButton({ label = "Choose from library", children, ...props }, ref) {
  return (
    <Button ref={ref} type="button" variant="outline" size="sm" {...props}>
      <ImagePlus className="h-4 w-4 me-1" />
      {children ?? label}
    </Button>
  );
});
MediaPickerTriggerButton.displayName = "MediaPickerTriggerButton";
