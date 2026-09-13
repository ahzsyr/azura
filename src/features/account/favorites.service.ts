import "server-only";

import type { FavoriteEntityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function listFavorites(userId: string) {
  return prisma.userFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function addFavorite(
  userId: string,
  entityType: FavoriteEntityType,
  entityId: string,
  locale: string
) {
  return prisma.userFavorite.upsert({
    where: {
      userId_entityType_entityId: { userId, entityType, entityId },
    },
    create: { userId, entityType, entityId, locale },
    update: { locale },
  });
}

export async function removeFavorite(
  userId: string,
  entityType: FavoriteEntityType,
  entityId: string
) {
  return prisma.userFavorite.deleteMany({
    where: { userId, entityType, entityId },
  });
}

export async function mergeFavorites(
  userId: string,
  items: { entityType: FavoriteEntityType; entityId: string; locale?: string }[]
) {
  if (items.length === 0) return { merged: 0 };
  let merged = 0;
  for (const item of items) {
    await prisma.userFavorite.upsert({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType: item.entityType,
          entityId: item.entityId,
        },
      },
      create: {
        userId,
        entityType: item.entityType,
        entityId: item.entityId,
        locale: item.locale ?? "en",
      },
      update: {},
    });
    merged += 1;
  }
  return { merged };
}

export async function isFavorited(
  userId: string,
  entityType: FavoriteEntityType,
  entityId: string
) {
  const row = await prisma.userFavorite.findUnique({
    where: {
      userId_entityType_entityId: { userId, entityType, entityId },
    },
  });
  return Boolean(row);
}

export async function getFavoriteIdsForUser(userId: string, entityType: FavoriteEntityType) {
  const rows = await prisma.userFavorite.findMany({
    where: { userId, entityType },
    select: { entityId: true },
  });
  return rows.map((r) => r.entityId);
}
