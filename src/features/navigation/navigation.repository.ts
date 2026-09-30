import type { Prisma } from "@prisma/client";
import { jsonStoreService } from "@/features/storage/json-store.service";
import type { HeaderWorkspace } from "./types";

const NAMESPACE = "header-workspace";
const KEY = "default";

export const navigationRepository = {
  async get(): Promise<HeaderWorkspace | null> {
    return jsonStoreService.get<HeaderWorkspace>(NAMESPACE, KEY);
  },

  getCached() {
    return jsonStoreService.getCached<HeaderWorkspace>(NAMESPACE, KEY);
  },

  async save(data: HeaderWorkspace) {
    return jsonStoreService.set(NAMESPACE, KEY, data as unknown as Prisma.InputJsonValue, {
      revalidate: false,
    });
  },
};
