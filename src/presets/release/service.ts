import { prisma } from "@/lib/prisma";
import {
  loadBundleForRefs,
  localizedField,
  type EntityRef,
} from "@/features/portal/lib/portal-translation";
import type { ReleaseSetAdmin, ReleaseSetPublic } from "./types";

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((t): t is string => typeof t === "string");
  return [];
}

function collectReleaseSetRefs(row: {
  id: string;
  releases: { id: string; entries: { id: string }[] }[];
}): EntityRef[] {
  const refs: EntityRef[] = [{ entityType: "ReleaseSet", entityId: row.id }];
  for (const release of row.releases) {
    for (const entry of release.entries) {
      refs.push({ entityType: "ReleaseEntry", entityId: entry.id });
    }
  }
  return refs;
}

export const releaseSetService = {
  async getBySlug(slug: string): Promise<ReleaseSetPublic | null> {
    const row = await prisma.releaseSet.findFirst({
      where: { slug, isPublished: true },
      include: {
        releases: {
          where: { isPublished: true },
          orderBy: { sortOrder: "asc" },
          include: {
            entries: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });
    if (!row) return null;

    const bundle = await loadBundleForRefs(collectReleaseSetRefs(row));

    return {
      id: row.id,
      slug: row.slug,
      title: localizedField(bundle, "ReleaseSet", row.id, "title"),
      description: localizedField(bundle, "ReleaseSet", row.id, "description"),
      releases: row.releases.map((r) => ({
        id: r.id,
        version: r.version,
        releaseDate: r.releaseDate?.toISOString() ?? null,
        status: r.status,
        tags: parseTags(r.tags),
        entries: r.entries.map((e) => ({
          id: e.id,
          category: e.category,
          text: localizedField(bundle, "ReleaseEntry", e.id, "text"),
        })),
      })),
    };
  },

  async listForAdmin(): Promise<ReleaseSetAdmin[]> {
    const rows = await prisma.releaseSet.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { releases: true } } },
    });
    const bundle = await loadBundleForRefs(
      rows.map((row) => ({ entityType: "ReleaseSet", entityId: row.id }))
    );
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: localizedField(bundle, "ReleaseSet", row.id, "title"),
      description: localizedField(bundle, "ReleaseSet", row.id, "description"),
      sortOrder: row.sortOrder,
      isPublished: row.isPublished,
      releaseCount: row._count.releases,
    }));
  },

  async getByIdForAdmin(id: string) {
    return prisma.releaseSet.findUnique({
      where: { id },
      include: {
        releases: {
          orderBy: { sortOrder: "asc" },
          include: { entries: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });
  },
};
