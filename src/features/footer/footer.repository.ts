import { jsonStoreService } from "@/features/storage/json-store.service";
import type { Prisma } from "@prisma/client";
import type { FooterWorkspace } from "./types";

const NAMESPACE = "footer-workspace";
const KEY = "default";

export const footerRepository = {
  async get(): Promise<FooterWorkspace | null> {
    return jsonStoreService.get<FooterWorkspace>(NAMESPACE, KEY);
  },

  async save(workspace: FooterWorkspace): Promise<void> {
    await jsonStoreService.set(
      NAMESPACE,
      KEY,
      JSON.parse(JSON.stringify(workspace)) as Prisma.InputJsonValue,
    );
  },
};
