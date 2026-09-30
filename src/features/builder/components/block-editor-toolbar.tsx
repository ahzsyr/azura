"use client";

import type { BlockNode, PageBlocks } from "@/types/builder";
import { Button } from "@/components/ui/button";
import {
  Copy,
  ClipboardPaste,
  Download,
  Upload,
  Files,
} from "lucide-react";
import {
  copyBlockToClipboard,
  duplicateBlock,
  exportBlocksJson,
  importBlocksJson,
  pasteBlockFromClipboard,
} from "@/features/builder/clipboard/block-clipboard";
type BlockEditorToolbarProps = {
  blocks: PageBlocks;
  selectedBlock: BlockNode | null;
  onBlocksChange: (blocks: PageBlocks) => void;
  onSelectBlock: (id: string | null) => void;
};

export function BlockEditorToolbar({
  blocks,
  selectedBlock,
  onBlocksChange,
  onSelectBlock,
}: BlockEditorToolbarProps) {
  const handleDuplicate = () => {
    if (!selectedBlock) return;
    const { blocks: next, newId } = duplicateBlock(blocks, selectedBlock.id);
    onBlocksChange(next);
    if (newId) onSelectBlock(newId);
  };

  const handleCopy = () => {
    if (!selectedBlock) return;
    copyBlockToClipboard(selectedBlock);
  };

  const handlePaste = () => {
    const pasted = pasteBlockFromClipboard();
    if (!pasted) return;
    onBlocksChange([...blocks, pasted]);
    onSelectBlock(pasted.id);
  };

  const handleExport = () => {
    if (!selectedBlock) return;
    const json = exportBlocksJson([selectedBlock]);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedBlock.type}-${selectedBlock.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const raw = window.prompt("Paste block JSON");
    if (!raw) return;
    try {
      const imported = importBlocksJson(raw.startsWith("[") ? raw : `[${raw}]`);
      onBlocksChange([...blocks, ...imported]);
      if (imported[0]) onSelectBlock(imported[0].id);
    } catch {
      window.alert("Invalid block JSON");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!selectedBlock}
        onClick={handleDuplicate}
      >
        <Files className="h-3.5 w-3.5 me-1" />
        Duplicate
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!selectedBlock}
        onClick={handleCopy}
      >
        <Copy className="h-3.5 w-3.5 me-1" />
        Copy
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={handlePaste}>
        <ClipboardPaste className="h-3.5 w-3.5 me-1" />
        Paste
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!selectedBlock}
        onClick={handleExport}
      >
        <Download className="h-3.5 w-3.5 me-1" />
        Export
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={handleImport}>
        <Upload className="h-3.5 w-3.5 me-1" />
        Import
      </Button>
    </div>
  );
}
