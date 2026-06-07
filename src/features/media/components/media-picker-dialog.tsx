"use client";

import {
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useState,
  useTransition,
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type ReactElement,
} from "react";
import type { MediaType } from "@prisma/client";
import Image from "next/image";
import { fetchMediaAssets } from "@/features/media/actions";
import type { MediaAssetRow } from "./media-asset-card";
import { formatBytes } from "@/features/media/media.service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Film, FileText, Loader2 } from "lucide-react";

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
  onSelect: (asset: MediaPickResult) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function MediaPickerDialog({
  trigger,
  mediaTypes,
  onSelect,
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
  const [assets, setAssets] = useState<MediaAssetRow[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MediaType | "ALL">("ALL");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    startTransition(async () => {
      const rows = await fetchMediaAssets({
        search: debouncedSearch || undefined,
        mediaType:
          typeFilter !== "ALL"
            ? typeFilter
            : mediaTypes?.length === 1
              ? mediaTypes[0]
              : undefined,
      });
      const filtered = mediaTypes?.length
        ? rows.filter((a) => mediaTypes.includes(a.mediaType))
        : rows;
      setAssets(filtered as MediaAssetRow[]);
    });
  }, [debouncedSearch, typeFilter, mediaTypes]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const types = mediaTypes ?? (["IMAGE", "VIDEO", "DOCUMENT", "SVG"] as MediaType[]);

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
            <DialogDescription>Search and select an asset from your media library.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="Search by name, alt, or URL…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
              aria-label="Search media"
            />
            {types.length > 1 && (
              <select
                className="border rounded-md h-9 px-2 text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as MediaType | "ALL")}
                aria-label="Filter by media type"
              >
                <option value="ALL">All types</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
            <Button type="button" variant="outline" size="sm" onClick={load} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 relative">
            {pending && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-2">
              {assets.map((asset) => {
                const isVisual = asset.mediaType === "IMAGE" || asset.mediaType === "SVG";
                return (
                  <button
                    key={asset.id}
                    type="button"
                    className="text-start border rounded-lg overflow-hidden hover:ring-2 hover:ring-primary/40 transition-shadow focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => {
                      onSelect({
                        id: asset.id,
                        url: asset.url,
                        filename: asset.filename,
                        mediaType: asset.mediaType,
                        altEn: asset.altEn,
                        altAr: asset.altAr,
                      });
                      handleOpenChange(false);
                    }}
                  >
                    <div className="aspect-square relative bg-muted">
                      {isVisual ? (
                        <Image src={asset.url} alt={asset.altEn || asset.filename} fill className="object-cover" sizes="150px" />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-1 p-2">
                          {asset.mediaType === "VIDEO" ? (
                            <Film className="h-6 w-6 text-muted-foreground" />
                          ) : (
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          )}
                          <span className="text-[10px]">{asset.mediaType}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs truncate font-medium">{asset.filename}</p>
                      <p className="text-[10px] text-muted-foreground">{formatBytes(asset.sizeBytes)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {!pending && assets.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No media found. Try a different search or upload files in Media Manager.
              </p>
            )}
          </div>
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
