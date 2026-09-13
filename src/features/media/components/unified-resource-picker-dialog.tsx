"use client";

import {
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import type { MediaType } from "@prisma/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ImagePlus } from "lucide-react";
import { CmsMediaPickerPanel } from "./cms-media-picker-panel";
import { MediaManagerApp } from "@/features/catalog/admin/media/MediaManagerApp";
import { cmsMediaTypesToCatalog } from "@/features/media/lib/media-type-map";
import { IconPickerPanel } from "@/features/icons/components/icon-picker-panel";
import type { IconPickerSelectResult } from "@/features/icons/components/icon-picker-panel";

export type MediaPickResult = {
  type: "media";
  mediaId: string | null;
  url: string;
  source: "cms" | "site";
  filename?: string;
};

export type IconPickResult = {
  type: "icon";
  iconId: string;
  source: "builtin" | "custom" | "font";
};

export type ResourcePickResult = MediaPickResult | IconPickResult;

export function isMediaPickResult(result: ResourcePickResult): result is MediaPickResult {
  return result.type === "media";
}

export function isIconPickResult(result: ResourcePickResult): result is IconPickResult {
  return result.type === "icon";
}

type AllowedType = "media" | "icons";

type Props = {
  trigger?: ReactNode;
  allowedTypes?: AllowedType[];
  mediaTypes?: MediaType[];
  onSelect: (result: ResourcePickResult) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultSource?: "cms" | "site" | "icons";
  showSiteFilesystem?: boolean;
};

export function UnifiedResourcePickerDialog({
  trigger,
  allowedTypes = ["media", "icons"],
  mediaTypes,
  onSelect,
  open: controlledOpen,
  onOpenChange,
  defaultSource,
  showSiteFilesystem = process.env.NEXT_PUBLIC_CATALOG_DB_ONLY !== "1",
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const effectiveDefaultSource = useMemo(() => {
    if (defaultSource) return defaultSource;
    // If icons are allowed and media is not, default to icons; otherwise default to cms.
    if (!allowedTypes.includes("media") && allowedTypes.includes("icons")) return "icons";
    return "cms";
  }, [allowedTypes, defaultSource]);

  const [sourceTab, setSourceTab] = useState<"cms" | "site" | "icons">(effectiveDefaultSource);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
      if (next) setSourceTab(effectiveDefaultSource);
    },
    [isControlled, onOpenChange, effectiveDefaultSource],
  );

  const openPicker = useCallback(() => handleOpenChange(true), [handleOpenChange]);

  const triggerNode =
    trigger && isValidElement(trigger)
      ? cloneElement(trigger as any, {
          onClick: (e: any) => {
            (trigger as any).props.onClick?.(e);
            if (!e.defaultPrevented) openPicker();
          },
        })
      : null;

  const showMedia = allowedTypes.includes("media");
  const showIcons = allowedTypes.includes("icons");
  const showSite = showMedia && showSiteFilesystem;

  const catalogAccept = cmsMediaTypesToCatalog(mediaTypes);

  const handleCmsSelect = useCallback(
    (asset: {
      id: string;
      url: string;
      filename: string;
      altEn: string;
      altAr: string;
    }) => {
      onSelect({
        type: "media",
        mediaId: asset.id,
        url: asset.url,
        source: "cms",
        filename: asset.filename,
      });
      handleOpenChange(false);
    },
    [handleOpenChange, onSelect],
  );

  const handleSiteSelect = useCallback(
    (item: { url: string; filename: string }) => {
      onSelect({
        type: "media",
        mediaId: null,
        url: item.url,
        source: "site",
        filename: item.filename,
      });
      handleOpenChange(false);
    },
    [handleOpenChange, onSelect],
  );

  const handleIconSelect = useCallback(
    (result: IconPickerSelectResult) => {
      onSelect({
        type: "icon",
        iconId: result.iconId,
        source: result.source,
      });
      handleOpenChange(false);
    },
    [handleOpenChange, onSelect],
  );

  // If some tabs are disabled, keep Tabs value aligned with visible options.
  const visibleTabValues: Array<"cms" | "site" | "icons"> = [];
  if (showMedia) visibleTabValues.push("cms");
  if (showSite) visibleTabValues.push("site");
  if (showIcons) visibleTabValues.push("icons");
  const firstVisible = visibleTabValues[0] ?? "cms";

  const effectiveSourceTab: "cms" | "site" | "icons" = visibleTabValues.includes(sourceTab) ? sourceTab : firstVisible;

  return (
    <>
      {triggerNode}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl h-[min(90vh,720px)] max-h-[90vh] overflow-hidden flex flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Resource library</DialogTitle>
            <DialogDescription>
              Select media (CMS/Site) or icons for CMS content.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={effectiveSourceTab}
            onValueChange={(v) => setSourceTab(v as any)}
            className="flex flex-col min-h-0 flex-1"
          >
            <TabsList className="shrink-0 w-fit">
              {showMedia ? <TabsTrigger value="cms">CMS (database)</TabsTrigger> : null}
              {showSite ? <TabsTrigger value="site">Site (filesystem)</TabsTrigger> : null}
              {showIcons ? <TabsTrigger value="icons">Icons</TabsTrigger> : null}
            </TabsList>

            {showMedia ? (
              <TabsContent value="cms" className="flex flex-col min-h-0 flex-1 mt-3 data-[state=inactive]:hidden">
                <CmsMediaPickerPanel mediaTypes={mediaTypes} onSelect={handleCmsSelect} active />
              </TabsContent>
            ) : null}

            {showSite ? (
              <TabsContent value="site" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
                <div className="mm-admin-embed min-h-[min(55vh,520px)] max-h-[min(55vh,520px)] overflow-hidden rounded-lg border">
                  <MediaManagerApp
                    pickerMode
                    pickerAccept={catalogAccept}
                    onPickerSelect={handleSiteSelect}
                  />
                </div>
              </TabsContent>
            ) : null}

            {showIcons ? (
              <TabsContent value="icons" className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden">
                <IconPickerPanel active={open && effectiveSourceTab === "icons"} onSelect={handleIconSelect} />
              </TabsContent>
            ) : null}
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const UnifiedResourcePickerTriggerButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof Button> & { label?: string }
>(function UnifiedResourcePickerTriggerButton({ label = "Choose resource", children, ...props }, ref) {
  return (
    <Button ref={ref} type="button" variant="outline" size="sm" {...props}>
      <ImagePlus className="h-4 w-4 me-1" />
      {children ?? label}
    </Button>
  );
});

