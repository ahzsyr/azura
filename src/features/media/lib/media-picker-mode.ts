import { hasMediaUrl } from "@/features/media/constants";

export type MediaPickerSourceMode = "link" | "upload";

export function initialMediaPickerMode(
  mediaId?: string | null,
  url?: string
): MediaPickerSourceMode {
  if (mediaId) return "upload";
  if (url?.startsWith("/uploads/")) return "upload";
  if (hasMediaUrl(url)) return "upload";
  return "link";
}
