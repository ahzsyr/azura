"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { MediaAsset, MediaFolder, MediaUsage, User } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import {
  deleteMediaAssets,
  getMediaAssetDetail,
  updateMediaAsset,
} from "@/features/media/actions";
import { MEDIA_USAGE_ENTITY_LABELS, usageAdminHref } from "@/features/media/constants";
import { formatBytes } from "@/features/media/media.service";
import { uploadMediaFile } from "@/features/media/upload-client";
import { acceptForMediaTypes } from "@/lib/local-media-storage";
import { AdminLocalizedTextField } from "@/features/translation/components/admin-localized-text-field";
import { useLocalizedField } from "@/features/translation/hooks/use-localized-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, ExternalLink, Upload } from "lucide-react";

type AssetDetail = MediaAsset & {
  usages: MediaUsage[];
  folder: MediaFolder | null;
  uploadedBy: Pick<User, "id" | "name" | "email"> | null;
};

type Props = {
  assetId: string | null;
  folders: (MediaFolder & { _count: { assets: number } })[];
  onClose: () => void;
  onUpdated: () => void;
};

export function MediaDetailPanel({ assetId, folders, onClose, onUpdated }: Props) {
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [pending, startTransition] = useTransition();
  const [filename, setFilename] = useState("");
  const [folderId, setFolderId] = useState<string>("");
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceError, setReplaceError] = useState("");
  const [replacing, setReplacing] = useState(false);

  const {
    value: altValue,
    onChange: onAltChange,
    save: saveAlt,
    reload: reloadAlt,
    englishFallback,
    loading: altLoading,
  } = useLocalizedField({
    entityType: "MediaAsset",
    entityId: assetId ?? undefined,
    field: "alt",
  });

  useEffect(() => {
    if (!assetId) {
      setAsset(null);
      return;
    }
    startTransition(async () => {
      const detail = await getMediaAssetDetail(assetId);
      if (detail) {
        setAsset(detail as AssetDetail);
        setFilename(detail.filename);
        setFolderId(detail.folderId ?? "");
      }
    });
  }, [assetId]);

  useEffect(() => {
    if (assetId) void reloadAlt();
  }, [assetId, reloadAlt]);

  if (!assetId) return null;

  const saveMeta = () => {
    if (!assetId) return;
    startTransition(async () => {
      await saveAlt();
      await updateMediaAsset(assetId, {
        filename,
        folderId: folderId || null,
      });
      onUpdated();
      const detail = await getMediaAssetDetail(assetId);
      if (detail) {
        setAsset(detail as AssetDetail);
      }
      await reloadAlt();
    });
  };

  const handleDelete = () => {
    if (!assetId) return;
    const msg =
      asset && asset.usages.length > 0
        ? `This file is used in ${asset.usages.length} place(s). Delete anyway?`
        : "Delete this file?";
    if (!confirm(msg)) return;
    startTransition(async () => {
      const result = await deleteMediaAssets([assetId]);
      if (!result.success) {
        alert(result.error ?? "Delete failed. Please try again.");
        return;
      }
      onUpdated();
      onClose();
    });
  };

  const handleReplaceFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !assetId || !asset) return;

    setReplacing(true);
    setReplaceError("");
    try {
      await uploadMediaFile(file, {
        mediaType: asset.mediaType,
        folderId: asset.folderId,
        replaceId: assetId,
      });
      onUpdated();
      const detail = await getMediaAssetDetail(assetId);
      if (detail) {
        setAsset(detail as AssetDetail);
      }
      await reloadAlt();
    } catch (error) {
      setReplaceError(error instanceof Error ? error.message : "Replace failed");
    } finally {
      setReplacing(false);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  };

  const previewAlt = altValue || englishFallback || filename;

  return (
    <div className="fixed inset-y-0 end-0 z-50 w-full max-w-md border-s bg-background shadow-xl flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold text-sm">File details</h3>
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted">
          <X className="h-5 w-5" />
        </button>
      </div>

      {!asset ? (
        <p className="p-6 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="relative aspect-video rounded-lg bg-muted overflow-hidden">
            {asset.mediaType === "IMAGE" || asset.mediaType === "SVG" ? (
              <Image src={asset.url} alt={previewAlt} fill className="object-contain" sizes="400px" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {asset.mediaType} preview
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label>Filename</Label>
              <Input value={filename} onChange={(e) => setFilename(e.target.value)} className="mt-1" />
            </div>
            <AdminLocalizedTextField
              fieldKey="alt"
              label="Alt text"
              value={altValue}
              onChange={(_localeCode, value) => onAltChange(value)}
            />
            {altLoading ? (
              <p className="text-xs text-muted-foreground">Loading alt text…</p>
            ) : null}
            <div>
              <Label>Folder</Label>
              <select
                className="w-full border rounded-md h-10 px-3 mt-1 text-sm"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
              >
                <option value="">— Root —</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" size="sm" disabled={pending || altLoading} onClick={saveMeta}>
              Save metadata
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Type: {asset.mediaType} · {asset.mimeType}</p>
            <p>Size: {formatBytes(asset.sizeBytes)}</p>
            {asset.width && asset.height && (
              <p>
                Dimensions: {asset.width}×{asset.height}
              </p>
            )}
            {asset.uploadedBy && <p>Uploaded by: {asset.uploadedBy.name}</p>}
            <p>Created: {new Date(asset.createdAt).toLocaleString()}</p>
          </div>

          <div>
            <Label className="mb-2 block">Replace file</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Upload a new file to keep the same ID and usage references.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={replacing}
              onClick={() => replaceInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5 me-1.5" />
              {replacing ? "Uploading…" : "Choose replacement file"}
            </Button>
            <input
              ref={replaceInputRef}
              type="file"
              accept={acceptForMediaTypes([asset.mediaType])}
              tabIndex={-1}
              aria-hidden
              className="hidden"
              onChange={(e) => void handleReplaceFile(e.target.files)}
            />
            {replaceError ? <p className="text-xs text-destructive mt-2">{replaceError}</p> : null}
          </div>

          <div>
            <Label className="mb-2 block">Usage ({asset.usages.length})</Label>
            {asset.usages.length === 0 ? (
              <p className="text-xs text-muted-foreground">Not referenced yet.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {asset.usages.map((u) => {
                  const href = usageAdminHref(u.entityType, u.entityId);
                  const label = MEDIA_USAGE_ENTITY_LABELS[u.entityType] ?? u.entityType;
                  return (
                    <li key={u.id} className="flex items-center justify-between gap-2 border rounded-md px-2 py-1.5">
                      <span>
                        {label} · <code className="text-[10px]">{u.field}</code>
                      </span>
                      {href ? (
                        <Link href={href} className="text-primary hover:underline flex items-center gap-0.5">
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={handleDelete}>
            Delete file
          </Button>
        </div>
      )}
    </div>
  );
}
