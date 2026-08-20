import type { ContentSnapshot } from "../../types";
import { normalizeRemoteImageUrl } from "@/lib/config/next-image";

type SnapshotMetadata = Readonly<{
  featuredImage?: string;
  representativeImage?: string;
  heroImage?: string;
  siteLogo?: string;
}>;

function snapshotMetadata(snapshot: ContentSnapshot): SnapshotMetadata {
  const raw = (snapshot as ContentSnapshot & { metadata?: SnapshotMetadata }).metadata;
  return raw ?? {};
}

function isDecorativeImage(image: { src: string; alt?: string }): boolean {
  const alt = image.alt?.toLowerCase() ?? "";
  if (!alt.trim()) return false;
  return /icon|logo|badge|avatar|spacer|pixel/.test(alt);
}

function normalizeImageSrc(src: string | undefined): string | undefined {
  if (!src?.trim()) return undefined;
  return normalizeRemoteImageUrl(src.trim()) ?? src.trim();
}

/**
 * Selects the best social/OG image from snapshot content.
 * Priority: explicit -> featured/hero -> representative entity -> first meaningful content image.
 */
export function selectPrimaryContentImage(
  snapshot: ContentSnapshot,
  explicit?: string | null,
): string | undefined {
  const normalizedExplicit = normalizeImageSrc(explicit ?? undefined);
  if (normalizedExplicit) return normalizedExplicit;

  const meta = snapshotMetadata(snapshot);
  const fromMeta =
    normalizeImageSrc(meta.featuredImage) ??
    normalizeImageSrc(meta.heroImage) ??
    normalizeImageSrc(meta.representativeImage);
  if (fromMeta) return fromMeta;

  const meaningful = snapshot.images.find((img) => img.src?.trim() && !isDecorativeImage(img));
  if (meaningful?.src) return normalizeImageSrc(meaningful.src);

  const fallback = snapshot.images.find((img) => img.src?.trim());
  return normalizeImageSrc(fallback?.src);
}

export function resolveSeoImageChain(input: {
  explicit?: string | null;
  snapshot?: ContentSnapshot | null;
  siteLogo?: string | null;
  systemDefault?: string;
}): string | undefined {
  const fromSnapshot = input.snapshot
    ? selectPrimaryContentImage(input.snapshot, input.explicit)
    : normalizeImageSrc(input.explicit ?? undefined);
  if (fromSnapshot) return fromSnapshot;
  const siteLogo = normalizeImageSrc(input.siteLogo ?? undefined);
  if (siteLogo) return siteLogo;
  return normalizeImageSrc(input.systemDefault);
}
