"use client";

import { MediaFieldUploadButton } from "@/features/media/components/media-field-upload-button";

export function ImageUrlUpload({
  onUpload,
}: {
  onUpload: (url: string) => void;
}) {
  return (
    <MediaFieldUploadButton
      mediaTypes={["IMAGE", "SVG"]}
      label="Upload image"
      onComplete={({ url }) => onUpload(url)}
    />
  );
}
