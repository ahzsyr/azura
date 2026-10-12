import type { DocumentationBlockInput, DocPortalPublic } from "./types";
import { getDocPortalBySlugCached } from "@/services/data-loaders";
import { isModuleActive } from "./module-profile";

export async function resolveDocumentationForBlock(
  props: DocumentationBlockInput
): Promise<DocPortalPublic | null> {
  if (!(await isModuleActive())) return null;
  const slug = (props.docPortalSlug ?? "").trim();
  if (!slug) return null;
  return getDocPortalBySlugCached(slug, props.versionSlug, props.rootSectionSlug);
}

/** @deprecated Use resolveDocumentationForBlock */
export const resolveDocPortalForBlock = resolveDocumentationForBlock;
