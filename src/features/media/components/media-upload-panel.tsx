"use client";

import type { MediaType } from "@prisma/client";
import { acceptLabelForType } from "@/features/media/media.service";
import { LocalUploadDropzone } from "./local-upload-dropzone";
import { MediaStorageNotice } from "./media-storage-notice";

type Props = {
  uploadType?: MediaType;
  folderId?: string | null;
  onUploadComplete: () => void;
};

export function MediaUploadPanel({ uploadType, folderId, onUploadComplete }: Props) {
  return (
    <div className="border rounded-lg p-4 border-dashed bg-muted/30">
      <MediaStorageNotice />
      <p className="text-xs text-muted-foreground mb-3">
        Drag and drop or click to upload · {acceptLabelForType(uploadType)}
        {folderId ? " · Saving to selected folder" : " · Root folder"}
      </p>
      <LocalUploadDropzone
        uploadType={uploadType}
        folderId={folderId}
        onUploadComplete={() => onUploadComplete()}
      />
    </div>
  );
}
