import { prisma } from "@/lib/prisma";
import type { IconSource, Prisma } from "@prisma/client";

export type IconAssetRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  tags: unknown;
  source: IconSource;
  type: string;
  iconName: string | null;
  fontFamily: string | null;
  glyph: string | null;
  unicode: string | null;
  glyphKey: string | null;
  enabled: boolean;
  libraryId: string | null;
  _count?: { usages: number };
};

function iconDelegate() {
  // The Prisma client type surface differs between generated builds/environments,
  // so we access the delegate dynamically and keep downstream casts explicit.
  return (prisma as any).iconAsset;
}

export const iconRepository = {
  async listIcons(params?: {
    search?: string;
    source?: IconSource;
    category?: string;
    enabled?: boolean;
  }): Promise<IconAssetRow[]> {
    const delegate = iconDelegate();
    if (!delegate?.findMany) return [];

    const where: Prisma.IconAssetWhereInput = {};
    if (params?.source) where.source = params.source;
    if (params?.category) where.category = params.category;
    if (params?.enabled !== undefined) where.enabled = params.enabled;
    if (params?.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { name: { contains: q } },
        { slug: { contains: q } },
        { category: { contains: q } },
        { iconName: { contains: q } },
        { glyph: { contains: q } },
      ];
    }

    return delegate.findMany({
      where,
      orderBy: [{ source: "asc" }, { name: "asc" }],
      include: { _count: { select: { usages: true } } },
    }) as unknown as Promise<IconAssetRow[]>;
  },

  async getIcon(id: string) {
    const delegate = iconDelegate();
    if (!delegate?.findUnique) return null;
    // Note: `iconDelegate()` is intentionally loose-typed (it may be missing in some builds),
    // so we cast the result to our `IconAssetRow` shape.
    return delegate.findUnique({
      where: { id },
      include: {
        library: true,
        usages: { orderBy: { createdAt: "desc" }, take: 50 },
        _count: { select: { usages: true } },
      },
    }) as unknown as (IconAssetRow & {
      _count?: { usages: number };
      library?: unknown;
      usages?: unknown[];
    }) | null;
  },

  async upsertIcon(data: Prisma.IconAssetCreateInput & { id: string }) {
    const delegate = iconDelegate();
    if (!delegate?.upsert) throw new Error("Icon storage not configured");
    const { id, ...rest } = data;
    return delegate.upsert({
      where: { id },
      update: rest as Prisma.IconAssetUpdateInput,
      create: data,
    });
  },

  async deleteIcon(id: string) {
    const delegate = iconDelegate();
    if (!delegate?.delete) throw new Error("Icon storage not configured");
    return delegate.delete({ where: { id } });
  },

  async listLibraries() {
    const delegate = (prisma as unknown as { iconLibrary?: { findMany: Function } }).iconLibrary;
    if (!delegate?.findMany) return [];
    return delegate.findMany({
      where: { enabled: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { icons: true } } },
    });
  },

  async upsertLibrary(data: Prisma.IconLibraryCreateInput & { id?: string; slug: string }) {
    const delegate = (prisma as unknown as { iconLibrary?: { upsert: Function } }).iconLibrary;
    if (!delegate?.upsert) throw new Error("Icon library storage not configured");
    return delegate.upsert({
      where: { slug: data.slug },
      update: data as Prisma.IconLibraryUpdateInput,
      create: data,
    });
  },

  async trackUsage(iconId: string, entityType: string, entityId: string, field = "default") {
    const delegate = (prisma as unknown as { iconUsage?: { findFirst: Function; create: Function } })
      .iconUsage;
    if (!delegate?.create) return null;
    const existing = await delegate.findFirst({
      where: { iconId, entityType, entityId, field },
    });
    if (existing) return existing;
    return delegate.create({ data: { iconId, entityType, entityId, field } });
  },
};
