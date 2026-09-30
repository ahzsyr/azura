import type { DocPortal, DocSection, DocVersion } from "@prisma/client";
import {
  legacyShapeFromBundle,
  loadBundleForRefs,
  type EntityRef,
  type TranslationBundle,
} from "@/features/portal/lib/portal-translation";

export type DocPortalFormDrafts = {
  portalLegacy: Record<string, string>;
  versions: Record<string, unknown>[];
  sections: Record<string, unknown>[];
};

function collectDocPortalRefs(
  portal: DocPortal & { versions: DocVersion[]; sections: DocSection[] }
): EntityRef[] {
  return [
    { entityType: "DocPortal", entityId: portal.id },
    ...portal.versions.map((version) => ({ entityType: "DocVersion", entityId: version.id })),
    ...portal.sections.map((section) => ({ entityType: "DocSection", entityId: section.id })),
  ];
}

export async function loadDocPortalFormDrafts(
  portal: DocPortal & { versions: DocVersion[]; sections: DocSection[] }
): Promise<DocPortalFormDrafts> {
  const bundle = await loadBundleForRefs(collectDocPortalRefs(portal));
  return buildDocPortalFormDrafts(portal, bundle);
}

export function buildDocPortalFormDrafts(
  portal: DocPortal & { versions: DocVersion[]; sections: DocSection[] },
  bundle: TranslationBundle
): DocPortalFormDrafts {
  return {
    portalLegacy: legacyShapeFromBundle(bundle, "DocPortal", portal.id, ["title", "description"]),
    versions: portal.versions.map((version) => ({
      id: version.id,
      slug: version.slug,
      isDefault: version.isDefault,
      isPublished: version.isPublished,
      sortOrder: version.sortOrder,
      ...legacyShapeFromBundle(bundle, "DocVersion", version.id, ["label"]),
    })),
    sections: portal.sections.map((section) => ({
      id: section.id,
      versionId: section.versionId ?? "",
      parentId: section.parentId ?? "",
      slug: section.slug,
      href: section.href,
      isPublished: section.isPublished,
      sortOrder: section.sortOrder,
      ...legacyShapeFromBundle(bundle, "DocSection", section.id, ["title", "content"]),
    })),
  };
}
