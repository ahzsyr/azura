"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { FileText, ImageIcon, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadFileItem = {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  previewUrl?: string;
  progress: number;
  status: "idle" | "dragging" | "uploading" | "processing" | "completed" | "error";
  error?: string;
  file?: File;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <ImageIcon className="size-4" aria-hidden />;
  return <FileText className="size-4" aria-hidden />;
}

export function UploadDropzone({
  accept,
  maxFileSizeMb = 10,
  multiple = true,
  disabled,
  value = [],
  onChange,
  onUpload,
  labels,
  className,
}: {
  accept?: string;
  maxFileSizeMb?: number;
  multiple?: boolean;
  disabled?: boolean;
  value?: UploadFileItem[];
  onChange: (files: UploadFileItem[]) => void;
  onUpload?: (file: File) => Promise<{ url: string; id?: string }>;
  labels?: {
    title?: string;
    browse?: string;
    hint?: string;
  };
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (!files.length) return;
      // Single-file fields replace the previous selection instead of appending.
      const next = multiple ? [...value] : [];

      for (const file of files) {
        const id = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`;
        if (file.size > maxFileSizeMb * 1024 * 1024) {
          next.push({
            id,
            name: file.name,
            size: file.size,
            type: file.type,
            progress: 0,
            status: "error",
            error: `File too large (max ${maxFileSizeMb} MB)`,
            file,
          });
          continue;
        }

        const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
        const item: UploadFileItem = {
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: "uploading",
          previewUrl,
          file,
        };
        next.push(item);
        onChange([...next]);

        if (onUpload) {
          try {
            item.progress = 40;
            item.status = "processing";
            onChange([...next]);
            const result = await onUpload(file);
            item.progress = 100;
            item.status = "completed";
            item.url = result.url;
            onChange([...next]);
          } catch (err) {
            item.status = "error";
            item.error = err instanceof Error ? err.message : "Upload failed";
            onChange([...next]);
          }
        } else {
          item.progress = 100;
          item.status = "completed";
          item.url = file.name;
          onChange([...next]);
        }

        if (!multiple) break;
      }
    },
    [maxFileSizeMb, multiple, onChange, onUpload, value],
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    void processFiles(e.dataTransfer.files);
  };

  const removeAt = (id: string) => {
    onChange(value.filter((f) => f.id !== id));
  };

  const retry = (id: string) => {
    const item = value.find((f) => f.id === id);
    if (!item?.file) return;
    void processFiles([item.file]);
    onChange(value.filter((f) => f.id !== id));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--schema-radius-lg)] border-2 border-dashed px-4 py-8 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border/80 bg-muted/20 hover:border-primary/40",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <Paperclip className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">{labels?.title ?? "Drop files here"}</p>
        <p className="text-xs text-muted-foreground">
          or <span className="font-medium text-primary underline-offset-2">{labels?.browse ?? "Browse files"}</span>
        </p>
        <p className="text-[11px] text-muted-foreground">
          {labels?.hint ??
            `${accept ? accept.replace(/,/g, " · ") : "Any file"} · Maximum ${maxFileSizeMb} MB`}
        </p>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files) void processFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {value.length > 0 ? (
        <ul className="space-y-2">
          {value.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-3 rounded-lg border bg-background p-2.5"
            >
              {file.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.previewUrl} alt="" className="size-10 rounded object-cover" />
              ) : (
                <span className="flex size-10 items-center justify-center rounded bg-muted text-muted-foreground">
                  <FileIcon type={file.type} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</p>
                {file.status === "uploading" || file.status === "processing" ? (
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${file.progress}%` }} />
                  </div>
                ) : null}
                {file.error ? <p className="text-[11px] text-destructive">{file.error}</p> : null}
                {file.status === "completed" ? (
                  <p className="text-[11px] text-primary">Ready</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                {file.status === "error" ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => retry(file.id)}>
                    Retry
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => removeAt(file.id)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
