"use client";

import { useCallback, useRef, useState } from "react";
import type { MediaType } from "@prisma/client";
import { ALL_MEDIA_ACCEPT, ACCEPT_BY_TYPE } from "@/lib/local-media-storage";
import { uploadMediaFiles, type MediaUploadResult } from "@/features/media/upload-client";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  uploadType?: MediaType;
  folderId?: string | null;
  onUploadComplete?: (results: MediaUploadResult[]) => void;
  className?: string;
};

type UploadStatus = { name: string; state: "uploading" | "done" | "error"; message?: string };

export function LocalUploadDropzone({ uploadType, folderId, onUploadComplete, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statuses, setStatuses] = useState<UploadStatus[]>([]);
  const accept = uploadType ? ACCEPT_BY_TYPE[uploadType] : ALL_MEDIA_ACCEPT;

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;

      setUploading(true);
      setStatuses(list.map((file) => ({ name: file.name, state: "uploading" })));
      const results: MediaUploadResult[] = [];

      for (let i = 0; i < list.length; i++) {
        const file = list[i]!;
        try {
          const uploaded = await uploadMediaFiles([file], {
            folderId,
            mediaType: uploadType,
          });
          results.push(...uploaded);
          setStatuses((prev) =>
            prev.map((row, idx) => (idx === i ? { ...row, state: "done" } : row))
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Upload failed";
          setStatuses((prev) =>
            prev.map((row, idx) => (idx === i ? { ...row, state: "error", message } : row))
          );
        }
      }

      setUploading(false);
      if (results.length) onUploadComplete?.(results);
      window.setTimeout(() => setStatuses([]), 5000);
    },
    [folderId, onUploadComplete, uploadType]
  );

  const openFilePicker = () => {
    if (uploading) return;
    inputRef.current?.click();
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        role="presentation"
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (e.currentTarget === e.target) setDragging(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) void uploadFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
          dragging ? "border-primary bg-primary/10" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/40",
          uploading && "opacity-70"
        )}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {uploading ? "Uploading…" : "Drag and drop files here"}
        </p>
        <Button type="button" variant="secondary" size="sm" disabled={uploading} onClick={openFilePicker}>
          Choose file(s)
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        tabIndex={-1}
        aria-hidden
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files?.length) void uploadFiles(files);
          e.currentTarget.value = "";
        }}
      />

      {statuses.length > 0 && (
        <ul className="space-y-1 text-xs">
          {statuses.map((row) => (
            <li
              key={row.name}
              className={cn(
                row.state === "done" && "text-green-600",
                row.state === "error" && "text-destructive",
                row.state === "uploading" && "text-muted-foreground"
              )}
            >
              {row.state === "done" && "✓ "}
              {row.state === "error" && "✗ "}
              {row.name}
              {row.message ? ` — ${row.message}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
