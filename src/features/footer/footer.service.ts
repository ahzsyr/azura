import { createDefaultFooterWorkspace, mergeFooterWorkspaceImport } from "./defaults";
import { footerRepository } from "./footer.repository";
import { footerWorkspaceSchema } from "@/schemas/footer";
import type { FooterWorkspace } from "./types";

export const footerService = {
  async getWorkspace(): Promise<FooterWorkspace> {
    const raw = await footerRepository.get();
    if (!raw) {
      const defaults = createDefaultFooterWorkspace();
      await footerRepository.save(defaults);
      return defaults;
    }
    return mergeFooterWorkspaceImport(raw);
  },

  async saveWorkspace(payload: unknown): Promise<FooterWorkspace> {
    const merged = mergeFooterWorkspaceImport(payload);
    const parsed = footerWorkspaceSchema.parse(merged);
    await footerRepository.save(parsed);
    return parsed;
  },
};
