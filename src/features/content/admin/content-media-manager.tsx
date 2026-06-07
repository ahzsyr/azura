"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addContentItemMedia } from "@/features/content/actions";
import { MediaPickerDialog, MediaPickerTriggerButton } from "@/features/media/components/media-picker-dialog";
import { MediaPickerField } from "@/features/media/components/media-picker-field";
import { LocalUploadDropzone } from "@/features/media/components/local-upload-dropzone";
import { Button } from "@/components/ui/button";

type Props = {
  itemId: string;
};

export function ContentMediaManager({ itemId }: Props) {
  const router = useRouter();
  const [linkUrl, setLinkUrl] = useState("");
  const [pending, startTransition] = useTransition();

  const refresh = () => router.refresh();

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm font-medium">Add from link</p>
        <MediaPickerField
          label=""
          url={linkUrl}
          trackMediaId={false}
          idFieldName=""
          onChange={({ url }) => setLinkUrl(url)}
          mediaTypes={["IMAGE", "SVG"]}
        />
        <Button
          type="button"
          size="sm"
          onClick={() => {
            const url = linkUrl.trim();
            if (!url) return;
            startTransition(async () => {
              await addContentItemMedia(itemId, url);
              setLinkUrl("");
              refresh();
            });
          }}
          disabled={pending || !linkUrl.trim()}
        >
          {pending ? "Adding…" : "Add image from URL"}
        </Button>
      </div>

      <div className="space-y-3 rounded-lg border border-dashed p-4">
        <p className="text-sm font-medium">Upload new files</p>
        <LocalUploadDropzone
          uploadType="IMAGE"
          onUploadComplete={async (results) => {
            for (const file of results) {
              await addContentItemMedia(itemId, file.url);
            }
            refresh();
          }}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Add from media library</p>
        <MediaPickerDialog
          mediaTypes={["IMAGE", "SVG"]}
          onSelect={async (asset) => {
            await addContentItemMedia(itemId, asset.url, asset.altEn, asset.altAr);
            refresh();
          }}
          trigger={<MediaPickerTriggerButton label="Choose from media library" />}
        />
      </div>
    </div>
  );
}
