"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addGalleryMediaQuick } from "@/features/gallery/actions";
import {
  MediaPickerDialog,
  MediaPickerTriggerButton,
  type MediaPickResult,
} from "@/features/media/components/media-picker-dialog";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { LocalUploadDropzone } from "@/features/media/components/local-upload-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  galleryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

async function addAssets(galleryId: string, assets: MediaPickResult[]) {
  for (const asset of assets) {
    await addGalleryMediaQuick(galleryId, asset.url, {
      titleEn: asset.altEn || asset.filename,
      titleAr: asset.altAr || asset.altEn || asset.filename,
      mediaAssetId: asset.id,
      mediaKind: asset.mediaType === "VIDEO" ? "VIDEO" : "IMAGE",
    });
  }
}

export function GalleryAddMediaModal({ galleryId, open, onOpenChange }: Props) {
  const router = useRouter();
  const [linkUrl, setLinkUrl] = useState("");
  const [linkMediaId, setLinkMediaId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setFormKey((k) => k + 1);
      setLinkUrl("");
      setLinkMediaId(null);
    }
    onOpenChange(next);
  };

  const refreshAndClose = () => {
    router.refresh();
    onOpenChange(false);
  };

  const addFromLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    startTransition(async () => {
      await addGalleryMediaQuick(galleryId, url, {
        mediaAssetId: linkMediaId ?? undefined,
        mediaKind: /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url) ? "VIDEO" : "IMAGE",
      });
      refreshAndClose();
    });
  };

  const batchAdd = (addFn: () => Promise<void>) => {
    startTransition(async () => {
      await addFn();
      refreshAndClose();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add media</DialogTitle>
          <DialogDescription>
            Link a URL, upload files, or pick from the media library.
          </DialogDescription>
        </DialogHeader>

        <div key={formKey} className="space-y-6">
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Add from link</p>
            <p className="text-xs text-muted-foreground">Paste a direct photo or video URL.</p>
            <UrlPrimaryMediaPickerField
              label=""
              url={linkUrl}
              onChange={setLinkUrl}
              onMediaIdChange={setLinkMediaId}
              mediaTypes={["IMAGE", "VIDEO", "SVG"]}
            />
            <Button type="button" size="sm" onClick={addFromLink} disabled={pending || !linkUrl.trim()}>
              {pending ? "Adding…" : "Add from URL"}
            </Button>
          </div>

          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <p className="text-sm font-medium">Upload new files</p>
            <p className="text-xs text-muted-foreground">
              Drag and drop or upload — images and videos are saved to the media library.
            </p>
            <LocalUploadDropzone
              onUploadComplete={async (results) => {
                batchAdd(async () => {
                  for (const file of results) {
                    await addGalleryMediaQuick(galleryId, file.url, {
                      titleEn: file.filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") || "Untitled",
                      mediaAssetId: file.id,
                      mediaKind: file.mediaType === "VIDEO" ? "VIDEO" : "IMAGE",
                    });
                  }
                });
              }}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Add from media library</p>
            <MediaPickerDialog
              multi
              mediaTypes={["IMAGE", "VIDEO", "SVG"]}
              onSelectMultiple={(assets) => {
                batchAdd(() => addAssets(galleryId, assets));
              }}
              trigger={<MediaPickerTriggerButton label="Choose from media library" />}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
