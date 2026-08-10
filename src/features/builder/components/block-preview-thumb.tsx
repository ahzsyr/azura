import { normalizeLocalMediaUrl, normalizeRemoteImageUrl } from "@/lib/config/next-image";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt?: string;
  className?: string;
  /** When true, image fills its positioned parent (admin block preview thumbnails). */
  fill?: boolean;
};

/** Lightweight admin preview thumbnail — avoids next/image preload hints in the block editor. */
export function BlockPreviewThumb({ src, alt = "", className, fill }: Props) {
  const normalized = normalizeLocalMediaUrl(normalizeRemoteImageUrl(src) ?? src);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={normalized}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn(fill && "absolute inset-0 h-full w-full", className)}
      data-skip-img-fade
    />
  );
}
