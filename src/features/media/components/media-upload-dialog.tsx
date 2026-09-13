"use client";

import type { MediaType } from "@prisma/client";
import { acceptLabelForType } from "@/features/media/media.service";
import { LocalUploadDropzone } from "./local-upload-dropzone";
import { MediaStorageNotice } from "./media-storage-notice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadType?: MediaType;
  folderId?: string | null;
  onUploadComplete: () => void;
};

export function MediaUploadDialog({
  open,
  onOpenChange,
  uploadType,
  folderId,
  onUploadComplete,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload new media</DialogTitle>
          <DialogDescription>
            Drag and drop or choose files · {acceptLabelForType(uploadType)}
            {folderId ? " · Saving to selected folder" : " · Root folder"}
          </DialogDescription>
        </DialogHeader>
        <MediaStorageNotice />
        <LocalUploadDropzone
          uploadType={uploadType}
          folderId={folderId}
          onUploadComplete={() => {
            onUploadComplete();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
