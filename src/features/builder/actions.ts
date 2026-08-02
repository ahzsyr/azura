"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/auth/guards";
import { builderService } from "./builder.service";
import type { BlockNode, PageBlocks } from "@/types/builder";
import type { BlockPresetRecord, PageTemplateRecord } from "./constants";

export async function listBlockPresetsAction() {
  await requireAdmin();
  return builderService.listBlockPresets();
}

export async function saveBlockPresetAction(key: string, preset: BlockPresetRecord) {
  await requireAdmin();
  await builderService.saveBlockPreset(key, preset);
  return { ok: true };
}

export async function deleteBlockPresetAction(key: string) {
  await requireAdmin();
  await builderService.deleteBlockPreset(key);
  return { ok: true };
}

export async function listPageTemplatesAction() {
  await requireAdmin();
  return builderService.listPageTemplates();
}

export async function savePageTemplateAction(key: string, name: string, blocks: PageBlocks) {
  await requireAdmin();
  const validated = builderService.validateBlocks(blocks);
  await builderService.savePageTemplate(key, { name, blocks: validated });
  return { ok: true };
}

export async function loadBlockPresetAsNode(presetKey: string): Promise<BlockNode | null> {
  await requireAdmin();
  const presets = await builderService.listBlockPresets();
  const preset = presets[presetKey];
  if (!preset) return null;
  return builderService.presetToBlock(preset);
}
