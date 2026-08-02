import type { DocumentationBlockInput, DocPortalPublic } from "./types";
import { getDocPortalBySlugCached } from "@/services/data-loaders";

export async function resolveDocumentationForBlock(
  props: DocumentationBlockInput
): Promise<DocPortalPublic | null> {
  const slug = (props.docPortalSlug ?? "").trim();
  if (!slug) return null;
  return getDocPortalBySlugCached(slug, props.versionSlug, props.rootSectionSlug);
}

/** @deprecated Use resolveDocumentationForBlock */
export const resolveDocPortalForBlock = resolveDocumentationForBlock;
