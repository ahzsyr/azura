import type { BlockNode, PageBlocks } from "@/types/builder";
import { exportBlockInstance, importBlockInstance, parsePageBlocksExport } from "@/features/builder/migration/upgrade-blocks";
import { duplicateBlockInTree } from "@/features/builder/block-tree";

const CLIPBOARD_KEY = "azura:block-clipboard";

export type BlockClipboardPayload = {
  version: "2.0";
  exportedAt: string;
  blocks: BlockNode[];
  label?: string;
};

export function copyBlockToClipboard(block: BlockNode): BlockClipboardPayload {
  const payload: BlockClipboardPayload = {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    blocks: [JSON.parse(exportBlockInstance(block)) as BlockNode],
  };
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(CLIPBOARD_KEY, JSON.stringify(payload));
  }
  return payload;
}

export function copyBlocksToClipboard(blocks: PageBlocks, label?: string): BlockClipboardPayload {
  const payload: BlockClipboardPayload = {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    blocks: blocks.map((b) => JSON.parse(exportBlockInstance(b)) as BlockNode),
    label,
  };
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(CLIPBOARD_KEY, JSON.stringify(payload));
  }
  return payload;
}

export function readBlockClipboard(): BlockClipboardPayload | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(CLIPBOARD_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BlockClipboardPayload;
  } catch {
    return null;
  }
}

export function pasteBlockFromClipboard(): BlockNode | null {
  const clip = readBlockClipboard();
  if (!clip?.blocks[0]) return null;
  return importBlockInstance(JSON.stringify(clip.blocks[0]));
}

export function pasteBlocksFromClipboard(): PageBlocks {
  const clip = readBlockClipboard();
  if (!clip?.blocks.length) return [];
  return parsePageBlocksExport(JSON.stringify(clip.blocks));
}

export function exportBlocksJson(blocks: PageBlocks): string {
  return JSON.stringify(
    blocks.map((b) => JSON.parse(exportBlockInstance(b))),
    null,
    2
  );
}

export function importBlocksJson(json: string): PageBlocks {
  return parsePageBlocksExport(json);
}

export function duplicateBlock(blocks: PageBlocks, blockId: string) {
  return duplicateBlockInTree(blocks, blockId);
}
