"use client";

import type { MediaType } from "@prisma/client";
import { IMAGE_PICKER_MEDIA_TYPES } from "@/features/media/constants";
import { MediaPickerField } from "./media-picker-field";

type PickResult = { url: string; mediaId: string | null };

type Props = {
  label?: string;
  hint?: string;
  /** Stored URL — source of truth for persistence and rendering */
  value?: string;
  url?: string;
  mediaTypes?: MediaType[];
  previewSize?: { width: number; height: number };
  className?: string;
  /** Called with resolved URL when onPick is not set */
  onChange?: (url: string) => void;
  /** Combined pick handler (preferred for block editors) */
  onPick?: (pick: PickResult) => void;
  /** Optional — for usage tracking when using onChange instead of onPick */
  onMediaIdChange?: (mediaId: string | null) => void;
};

export function UrlPrimaryMediaPickerField({
  label,
  hint,
  value,
  url,
  mediaTypes = IMAGE_PICKER_MEDIA_TYPES,
  previewSize,
  className,
  onChange,
  onPick,
  onMediaIdChange,
}: Props) {
  const resolvedUrl = url ?? value ?? "";

  const handleChange = (pick: PickResult) => {
    if (onPick) {
      onPick(pick);
      return;
    }
    onChange?.(pick.url);
    onMediaIdChange?.(pick.mediaId);
  };

  return (
    <MediaPickerField
      label={label}
      hint={hint}
      url={resolvedUrl}
      trackMediaId={false}
      idFieldName=""
      mediaTypes={mediaTypes}
      previewSize={previewSize}
      className={className}
      onChange={handleChange}
    />
  );
}
