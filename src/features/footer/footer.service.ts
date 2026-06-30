import { createDefaultFooterWorkspace, mergeFooterWorkspaceImport } from "./defaults";
import { enrichFooterWorkspaceForSiteCached } from "./enrich-footer-translations";
import { footerRepository } from "./footer.repository";
import { footerWorkspaceSchema } from "@/schemas/footer";
import { publishShellChange } from "@/services/publish-propagation";
import type { FooterWorkspace } from "./types";
import { cache } from "react";

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

  async publishWorkspace(): Promise<import("@/services/publish-propagation").PublishResult> {
    return publishShellChange({ entityType: "footer" });
  },

  async patchWorkspace(changes: Record<string, unknown>): Promise<FooterWorkspace> {
    const current = await footerService.getWorkspace();
    const { applyPatch, isEmptyPatch } = await import("@/lib/patch");
    if (isEmptyPatch(changes)) return current;
    const merged = applyPatch(current as unknown as Record<string, unknown>, changes);
    return footerService.saveWorkspace(merged);
  },

  getWorkspaceForSite: cache(async (localePrefix: string = "en"): Promise<FooterWorkspace> => {
    const ws = await footerService.getWorkspace();
    try {
      return await enrichFooterWorkspaceForSiteCached(ws, localePrefix);
    } catch (error) {
      console.error("[footer] workspace enrichment failed:", error);
      return ws;
    }
  }),
};
