import { prisma } from "@/lib/prisma";
import {
  loadBundleForRefs,
  localizedField,
  type EntityRef,
} from "@/features/portal/lib/portal-translation";
import type { DocPortalAdmin, DocumentationBlockInput, DocPortalPublic } from "./types";

function collectDocPortalRefs(row: {
  id: string;
  versions: { id: string }[];
  sections: { id: string }[];
}): EntityRef[] {
  return [
    { entityType: "DocPortal", entityId: row.id },
    ...row.versions.map((v) => ({ entityType: "DocVersion", entityId: v.id })),
    ...row.sections.map((s) => ({ entityType: "DocSection", entityId: s.id })),
  ];
}

export const docPortalService = {
  async getBySlug(
    slug: string,
    opts?: Pick<DocumentationBlockInput, "versionSlug" | "rootSectionSlug">
  ): Promise<DocPortalPublic | null> {
    const row = await prisma.docPortal.findFirst({
      where: { slug, isPublished: true },
      include: {
        versions: {
          where: { isPublished: true },
          orderBy: { sortOrder: "asc" },
        },
        sections: {
          where: { isPublished: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!row) return null;

    let versionId: string | undefined;
    if (opts?.versionSlug) {
      const v = row.versions.find((ver) => ver.slug === opts.versionSlug);
      versionId = v?.id;
    } else {
      const defaultVer = row.versions.find((v) => v.isDefault) ?? row.versions[0];
      versionId = defaultVer?.id;
    }

    let sections = row.sections.filter(
      (s) => !versionId || s.versionId === versionId || !s.versionId
    );
    if (opts?.rootSectionSlug) {
      const root = sections.find((s) => s.slug === opts.rootSectionSlug);
      if (root) {
        const collect = (parentId: string): typeof sections => {
          const children = sections.filter((sec) => sec.parentId === parentId);
          return children.flatMap((c) => [c, ...collect(c.id)]);
        };
        sections = [root, ...collect(root.id)];
      }
    }

    const bundle = await loadBundleForRefs(collectDocPortalRefs(row));

    return {
      id: row.id,
      slug: row.slug,
      title: localizedField(bundle, "DocPortal", row.id, "title"),
      description: localizedField(bundle, "DocPortal", row.id, "description"),
      versions: row.versions.map((v) => ({
        id: v.id,
        slug: v.slug,
        label: localizedField(bundle, "DocVersion", v.id, "label"),
        isDefault: v.isDefault,
      })),
      sections: sections.map((s) => ({
        id: s.id,
        slug: s.slug,
        parentId: s.parentId,
        title: localizedField(bundle, "DocSection", s.id, "title"),
        href: s.href,
        content: localizedField(bundle, "DocSection", s.id, "content"),
        versionId: s.versionId,
      })),
    };
  },

  async listForAdmin(): Promise<DocPortalAdmin[]> {
    const rows = await prisma.docPortal.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { versions: true, sections: true } } },
    });
    const bundle = await loadBundleForRefs(
      rows.map((row) => ({ entityType: "DocPortal", entityId: row.id }))
    );
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: localizedField(bundle, "DocPortal", row.id, "title"),
      description: localizedField(bundle, "DocPortal", row.id, "description"),
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
      versionCount: row._count.versions,
      sectionCount: row._count.sections,
    }));
  },

  async getByIdForAdmin(id: string) {
    return prisma.docPortal.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { sortOrder: "asc" } },
        sections: { orderBy: { sortOrder: "asc" } },
      },
    });
  },
};
