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
import { MediaManagerApp } from "@/features/catalog/admin/media/MediaManagerApp";
import "@/features/catalog/admin/media/MediaManagerApp.css";
import { cmsMediaTypesToCatalog } from "@/features/media/lib/media-type-map";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ImagePlus } from "lucide-react";
import { CmsMediaPickerPanel } from "./cms-media-picker-panel";
import type { MediaPickResult } from "./media-picker-dialog";

export type UnifiedMediaPickResult = {
  url: string;
  mediaId: string | null;
  source: "cms" | "site";
  filename?: string;
};

type Props = {
  trigger?: React.ReactNode;
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
  const [internalOpen, setInternalOpen] = useState(false);
  const effectiveDefault = showSiteFilesystem ? defaultSource : "cms";
  const [sourceTab, setSourceTab] = useState<"cms" | "site">(effectiveDefault);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
      if (next) setSourceTab(effectiveDefault);
    },
    [isControlled, onOpenChange, effectiveDefault]
  );

  const openPicker = useCallback(() => {
    handleOpenChange(true);
  }, [handleOpenChange]);

  const handleCmsSelect = useCallback(
    (asset: MediaPickResult) => {
      onSelect({
        url: asset.url,
        mediaId: asset.id,
        source: "cms",
        filename: asset.filename,
      });
      handleOpenChange(false);
    },
    [onSelect, handleOpenChange]
  );

  const handleSiteSelect = useCallback(
    (item: { url: string; filename: string }) => {
      onSelect({
        url: item.url,
        mediaId: null,
        source: "site",
        filename: item.filename,
      });
      handleOpenChange(false);
    },
    [onSelect, handleOpenChange]
  );

  const catalogAccept = cmsMediaTypesToCatalog(mediaTypes);

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
        <DialogContent className="max-w-4xl h-[min(90vh,720px)] max-h-[90vh] overflow-hidden flex flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Media library</DialogTitle>
            <DialogDescription>
              {showSiteFilesystem
                ? "Select from CMS (database) or Site (filesystem) media."
                : "Select from CMS media (database and cloud storage)."}
            </DialogDescription>
          </DialogHeader>
          <Tabs
            value={sourceTab}
            onValueChange={(v) => setSourceTab(v as "cms" | "site")}
            className="flex flex-col min-h-0 flex-1"
          >
            <TabsList className="shrink-0 w-fit">
              <TabsTrigger value="cms">CMS (database)</TabsTrigger>
              {showSiteFilesystem ? (
                <TabsTrigger value="site">Site (filesystem)</TabsTrigger>
              ) : null}
            </TabsList>
            <TabsContent value="cms" className="flex flex-col min-h-0 flex-1 mt-3 data-[state=inactive]:hidden">
              <CmsMediaPickerPanel
                mediaTypes={mediaTypes}
                onSelect={handleCmsSelect}
                active={open && sourceTab === "cms"}
              />
            </TabsContent>
            {showSiteFilesystem ? (
              <TabsContent value="site" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
                <div className="mm-admin-embed min-h-[min(55vh,520px)] max-h-[min(55vh,520px)] overflow-hidden rounded-lg border">
                  {sourceTab === "site" ? (
                    <MediaManagerApp
                      pickerMode
                      pickerAccept={catalogAccept}
                      onPickerSelect={handleSiteSelect}
                    />
                  ) : null}
                </div>
              </TabsContent>
            ) : null}
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
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
