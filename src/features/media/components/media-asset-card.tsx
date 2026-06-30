"use client";

import type { MediaAsset, MediaFolder } from "@prisma/client";
import { FileText, Film, ImageIcon, Copy, Check } from "lucide-react";
import { formatBytes } from "@/features/media/media.service";
import { MediaPreviewImage } from "@/features/media/components/media-preview-image";
import { cn } from "@/lib/utils";
import { useState } from "react";

export type MediaAssetRow = MediaAsset & {
  folder: MediaFolder | null;
  _count: { usages: number };
  altEn?: string;
  altAr?: string;
};

type Props = {
  asset: MediaAssetRow;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
};

function TypeIcon({ type }: { type: MediaAsset["mediaType"] }) {
  if (type === "VIDEO") return <Film className="h-8 w-8 text-muted-foreground" />;
  if (type === "DOCUMENT") return <FileText className="h-8 w-8 text-muted-foreground" />;
  return <ImageIcon className="h-8 w-8 text-muted-foreground" />;
}

export function MediaAssetCard({ asset, selected, onSelect, onOpen }: Props) {
  const [copied, setCopied] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const isVisual = asset.mediaType === "IMAGE" || asset.mediaType === "SVG";

  const copyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(asset.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden bg-card transition-shadow hover:shadow-md",
        selected && "ring-2 ring-primary"
      )}
    >
      <div
        className="aspect-square relative bg-muted cursor-pointer"
        onClick={onOpen}
        onDoubleClick={onSelect}
      >
        {isVisual && !previewFailed ? (
          <MediaPreviewImage
            src={asset.url}
            alt={asset.altEn || asset.filename}
            fill
            className="object-cover"
            sizes="200px"
            onError={() => setPreviewFailed(true)}
          />
        ) : isVisual ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-2">
            <TypeIcon type={asset.mediaType} />
            <span className="text-[10px] text-muted-foreground text-center px-1">Preview unavailable</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-2">
            <TypeIcon type={asset.mediaType} />
            <span className="text-[10px] font-medium uppercase text-muted-foreground">{asset.mediaType}</span>
          </div>
        )}
        <label
          className="absolute top-2 start-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="h-4 w-4 rounded border-border"
          />
        </label>
      </div>
      <div className="p-2 space-y-1">
        <p className="text-xs truncate font-medium" title={asset.filename}>
          {asset.filename}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {formatBytes(asset.sizeBytes)} · {asset._count.usages} use{asset._count.usages === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1 rounded-md h-7 text-xs hover:bg-muted"
          onClick={copyUrl}
        >
          {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy URL"}
        </button>
      </div>
    </div>
  );
}
