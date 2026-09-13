import type { MediaType as CmsMediaType } from "@prisma/client";
import { mediaTypeFromFilename } from "@/lib/local-media-storage";
import type { MediaType as CatalogMediaType } from "@/features/catalog/admin/media/types";

const CMS_TO_CATALOG: Record<CmsMediaType, CatalogMediaType> = {
  IMAGE: "image",
  SVG: "svg",
  VIDEO: "video",
  DOCUMENT: "document",
};

export function cmsMediaTypesToCatalog(
  types: CmsMediaType[] | undefined
): CatalogMediaType[] | undefined {
  if (!types?.length) return undefined;
  const mapped = types
    .map((t) => CMS_TO_CATALOG[t])
    .filter((t): t is CatalogMediaType => t != null);
  return mapped.length > 0 ? mapped : undefined;
}

/** Map catalog file extension to CMS Prisma MediaType for Supabase uploads. */
export function catalogExtToCmsMediaType(ext: string): CmsMediaType {
  return mediaTypeFromFilename(`file${ext}`) ?? "DOCUMENT";
}
