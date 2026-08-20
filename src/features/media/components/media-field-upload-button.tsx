"use client";

import { useRef, useState } from "react";
import type { MediaType } from "@prisma/client";
import { acceptForMediaTypes } from "@/lib/local-media-storage";
import { uploadMediaFile } from "@/features/media/upload-client";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  mediaTypes?: MediaType[];
  onComplete: (result: { url: string; mediaId: string | null }) => void;
  className?: string;
  label?: string;
};

export function MediaFieldUploadButton({
  mediaTypes = ["IMAGE", "SVG"],
  onComplete,
  className,
  label = "Upload file",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const strictType = mediaTypes.length === 1 ? mediaTypes[0] : undefined;

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const result = await uploadMediaFile(file, { mediaType: strictType });
      onComplete({ url: result.url, mediaId: result.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-3.5 w-3.5 me-1.5" />
        {uploading ? "Uploading…" : label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={acceptForMediaTypes(mediaTypes)}
        tabIndex={-1}
        aria-hidden
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
