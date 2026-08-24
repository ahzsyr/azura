import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const jsonStoreRepository = {
  async get<T>(namespace: string, key: string): Promise<T | null> {
    const row = await prisma.jsonStore.findUnique({
      where: { namespace_key: { namespace, key } },
    });
    return row ? (row.data as T) : null;
  },

  async set(namespace: string, key: string, data: Prisma.InputJsonValue) {
    return prisma.jsonStore.upsert({
      where: { namespace_key: { namespace, key } },
      create: { namespace, key, data },
      update: { data, version: { increment: 1 } },
    });
  },

  async listNamespace(namespace: string) {
    return prisma.jsonStore.findMany({
      where: { namespace },
      orderBy: { key: "asc" },
    });
  },

  async listNamespaces() {
    return prisma.jsonStore.groupBy({
      by: ["namespace"],
      _count: { id: true },
      orderBy: { namespace: "asc" },
    });
  },

  async getById(id: string) {
    return prisma.jsonStore.findUnique({ where: { id } });
  },

  async delete(namespace: string, key: string) {
    return prisma.jsonStore.delete({
      where: { namespace_key: { namespace, key } },
    });
  },

  async deleteById(id: string) {
    return prisma.jsonStore.delete({ where: { id } });
  },

  async count() {
    return prisma.jsonStore.count();
  },

  async findAllForBackup() {
    return prisma.jsonStore.findMany({ orderBy: [{ namespace: "asc" }, { key: "asc" }] });
  },
};
