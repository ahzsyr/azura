import { jsonStoreService } from "@/features/storage/json-store.service";
import { jsonStoreRepository } from "@/repositories/json-store.repository";
import { JSON_STORE_SOURCES } from "../registry/data-sources";
import type { DataSourceDefinition } from "../registry/types";
import type { JsonNamespace } from "@/features/storage/constants";

export type JsonNamespaceCount = {
  namespace: string;
  count: number;
};

export const jsonStoreProvider = {
  getSources(): DataSourceDefinition[] {
    return JSON_STORE_SOURCES;
  },

  async getTotalCount(): Promise<number> {
    return jsonStoreRepository.count();
  },

  async getNamespaceCounts(): Promise<JsonNamespaceCount[]> {
    const groups = await jsonStoreRepository.listNamespaces();
    return groups.map((g: { namespace: string; _count: { id: number } }) => ({
      namespace: g.namespace,
      count: g._count.id,
    }));
  },

  listNamespace(namespace: JsonNamespace) {
    return jsonStoreService.listNamespace(namespace);
  },
};
