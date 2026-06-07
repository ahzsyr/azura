import { prisma } from "@/lib/prisma";
import type { MediaType, Prisma } from "@prisma/client";

export const mediaRepository = {
  listAssets(params?: {
    folderId?: string | null;
    search?: string;
    mediaType?: MediaType;
  }) {
    const where: Prisma.MediaAssetWhereInput = {};
    if (params?.folderId !== undefined) {
      where.folderId = params.folderId === null ? null : params.folderId;
    }
    if (params?.mediaType) where.mediaType = params.mediaType;
    if (params?.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { filename: { contains: q } },
        { altEn: { contains: q } },
        { altAr: { contains: q } },
        { mimeType: { contains: q } },
        { url: { contains: q } },
      ];
    }
    return prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { folder: true, _count: { select: { usages: true } } },
    });
  },

  getAsset(id: string) {
    return prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        usages: { orderBy: { createdAt: "desc" } },
        folder: true,
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });
  },

  findByUrl(url: string) {
    return prisma.mediaAsset.findFirst({ where: { url } });
  },

  createAsset(data: Prisma.MediaAssetCreateInput) {
    return prisma.mediaAsset.create({ data });
  },

  updateAsset(id: string, data: Prisma.MediaAssetUpdateInput) {
    return prisma.mediaAsset.update({ where: { id }, data });
  },

  deleteAssets(ids: string[]) {
    return prisma.mediaAsset.deleteMany({ where: { id: { in: ids } } });
  },

  listFolders() {
    return prisma.mediaFolder.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { assets: true, children: true } } },
    });
  },

  createFolder(name: string, parentId?: string | null) {
    return prisma.mediaFolder.create({ data: { name, parentId: parentId ?? null } });
  },

  renameFolder(id: string, name: string) {
    return prisma.mediaFolder.update({ where: { id }, data: { name } });
  },

  async deleteFolder(id: string) {
    await prisma.mediaAsset.updateMany({
      where: { folderId: id },
      data: { folderId: null },
    });
    return prisma.mediaFolder.delete({ where: { id } });
  },

  async trackUsage(mediaId: string, entityType: string, entityId: string, field = "default") {
    const existing = await prisma.mediaUsage.findFirst({
      where: { mediaId, entityType, entityId, field },
    });
    if (existing) return existing;
    return prisma.mediaUsage.create({ data: { mediaId, entityType, entityId, field } });
  },

  async removeUsage(mediaId: string, entityType: string, entityId: string, field = "default") {
    return prisma.mediaUsage.deleteMany({
      where: { mediaId, entityType, entityId, field },
    });
  },

  async totalStorageBytes() {
    const result = await prisma.mediaAsset.aggregate({ _sum: { sizeBytes: true } });
    return result._sum.sizeBytes ?? 0;
  },

  async storageStatsByType() {
    const rows = await prisma.mediaAsset.groupBy({
      by: ["mediaType"],
      _sum: { sizeBytes: true },
      _count: { id: true },
    });
    return rows;
  },
};
