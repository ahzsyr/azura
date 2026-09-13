import { jsonStoreRepository } from "@/repositories/json-store.repository";
import { createCached, CACHE_TAGS, revalidateJsonNamespace } from "@/services/cache";
import { ALLOWED_JSON_NAMESPACES, type JsonNamespace } from "./constants";
import type { Prisma } from "@prisma/client";

function assertNamespace(namespace: string): asserts namespace is JsonNamespace {
  if (!ALLOWED_JSON_NAMESPACES.includes(namespace as JsonNamespace)) {
    throw new Error(`Namespace not allowed: ${namespace}`);
  }
}

export const jsonStoreService = {
  async get<T>(namespace: string, key: string): Promise<T | null> {
    assertNamespace(namespace);
    return jsonStoreRepository.get<T>(namespace, key);
  },

  /** Server-cached read for hot paths (page-cache, settings). */
  getCached<T>(namespace: JsonNamespace, key: string) {
    const loader = createCached(
      () => jsonStoreRepository.get<T>(namespace, key),
      ["json-store", namespace, key],
      { tags: [CACHE_TAGS.json(namespace)], revalidate: 300 }
    );
    return loader();
  },

  async set(
    namespace: string,
    key: string,
    data: Prisma.InputJsonValue,
    options?: { revalidate?: boolean },
  ) {
    assertNamespace(namespace);
    const row = await jsonStoreRepository.set(namespace, key, data);
    if (options?.revalidate === true) {
      revalidateJsonNamespace(namespace);
    }
    return row;
  },

  listNamespace(namespace: string) {
    assertNamespace(namespace);
    return jsonStoreRepository.listNamespace(namespace);
  },

  async delete(namespace: string, key: string, options?: { revalidate?: boolean }) {
    assertNamespace(namespace);
    await jsonStoreRepository.delete(namespace, key);
    if (options?.revalidate === true) {
      revalidateJsonNamespace(namespace);
    }
  },

  listNamespaces: jsonStoreRepository.listNamespaces,
  getById: jsonStoreRepository.getById,
  deleteById: jsonStoreRepository.deleteById,

  async exportNamespace(namespace: string) {
    assertNamespace(namespace);
    const rows = await jsonStoreRepository.listNamespace(namespace);
    return Object.fromEntries(rows.map((r) => [r.key, r.data]));
  },

  async importNamespace(namespace: string, data: Record<string, Prisma.InputJsonValue>) {
    assertNamespace(namespace);
    for (const [key, value] of Object.entries(data)) {
      await jsonStoreRepository.set(namespace, key, value);
    }
    revalidateJsonNamespace(namespace);
  },

  async backupAll() {
    const rows = await jsonStoreRepository.findAllForBackup();
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      records: rows.map((r) => ({
        namespace: r.namespace,
        key: r.key,
        data: r.data,
        version: r.version,
      })),
    };
  },
};
