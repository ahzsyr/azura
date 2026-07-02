"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addGalleryMediaQuick } from "@/features/gallery/actions";
import { MediaPickerDialog, MediaPickerTriggerButton } from "@/features/media/components/media-picker-dialog";
import { UrlPrimaryMediaPickerField } from "@/features/media/components/url-primary-media-picker-field";
import { LocalUploadDropzone } from "@/features/media/components/local-upload-dropzone";
import { Button } from "@/components/ui/button";

type Props = {
  galleryId: string;
};

export function GalleryMediaManager({ galleryId }: Props) {
  const router = useRouter();
  const [linkUrl, setLinkUrl] = useState("");
  const [pending, startTransition] = useTransition();

  const refresh = () => router.refresh();

  const addFromLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    startTransition(async () => {
      await addGalleryMediaQuick(galleryId, url);
      setLinkUrl("");
      refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm font-medium">Add from link</p>
        <p className="text-xs text-muted-foreground">Paste a direct photo or video URL.</p>
        <UrlPrimaryMediaPickerField
          label=""
          url={linkUrl}
          onChange={setLinkUrl}
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
            startTransition(async () => {
              for (const file of results) {
                await addGalleryMediaQuick(galleryId, file.url, {
                  titleEn: file.filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") || "Untitled",
                  mediaAssetId: file.id,
                  mediaKind: file.mediaType === "VIDEO" ? "VIDEO" : "IMAGE",
                });
              }
              refresh();
            });
          }}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Add from media library</p>
        <MediaPickerDialog
          mediaTypes={["IMAGE", "VIDEO", "SVG"]}
          onSelect={async (asset) => {
            startTransition(async () => {
              await addGalleryMediaQuick(galleryId, asset.url, {
                titleEn: asset.altEn || asset.filename,
                titleAr: asset.altAr || asset.altEn || asset.filename,
                mediaAssetId: asset.id,
                mediaKind: asset.mediaType === "VIDEO" ? "VIDEO" : "IMAGE",
              });
              refresh();
            });
          }}
          trigger={<MediaPickerTriggerButton label="Choose from media library" />}
        />
      </div>
    </div>
  );
}
