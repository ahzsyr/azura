"use client";

import { useCallback, useEffect, useRef } from "react";
import type { PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/core/style.css";
import "@blocknote/shadcn/style.css";
import {
  blockNoteDocumentToStoredPayload,
  storedContentToBlockNoteDocument,
  type BlockNoteDocument,
} from "@/features/builder/blocks/content/admin/blocknote-pilot/serializers";
import { stableStringify } from "@/features/builder/blocks/content/admin/blocknote-pilot/stable-json";
import "./blocknote-pilot.css";

function asPartialBlocks(blocks: BlockNoteDocument): PartialBlock[] {
  return blocks as PartialBlock[];
}

type Props = {
  content: string;
  onChange: (json: string, html: string) => void;
  placeholder?: string;
  /** Optional HTML sibling used when TipTap JSON → BlockNote bridge needs a fallback. */
  htmlFallback?: string;
};

/**
 * Phase 1.5 pilot editor — BlockNote + shadcn UI, same (json, html) contract as TipTap.
 * Does not replace AdvancedRichTextEditor; gated by AZURA_BLOCKNOTE_PILOT=1.
 */
export function BlockNotePilotEditor({
  content,
  onChange,
  placeholder = "Write content…",
  htmlFallback = "",
}: Props) {
  const lastEmittedJsonRef = useRef<string | null>(null);
  const isApplyingExternalContentRef = useRef(false);
  const initialBlocksRef = useRef<BlockNoteDocument | null>(null);
  if (initialBlocksRef.current === null) {
    initialBlocksRef.current = storedContentToBlockNoteDocument(content, htmlFallback);
  }

  const editor = useCreateBlockNote(
    {
      initialContent:
        initialBlocksRef.current.length > 0
          ? asPartialBlocks(initialBlocksRef.current)
          : undefined,
      animations: false,
    },
    []
  );

  const emitChange = useCallback(
    (blocks: BlockNoteDocument) => {
      if (isApplyingExternalContentRef.current) return;
      const { tipTapJson, html } = blockNoteDocumentToStoredPayload(blocks);
      if (tipTapJson === lastEmittedJsonRef.current) return;
      lastEmittedJsonRef.current = tipTapJson;
      onChange(tipTapJson, html);
    },
    [onChange]
  );

  useEffect(() => {
    return editor.onChange((ed) => {
      emitChange(ed.document as BlockNoteDocument);
    });
  }, [editor, emitChange]);

  useEffect(() => {
    if (content === lastEmittedJsonRef.current) return;

    const nextBlocks = storedContentToBlockNoteDocument(content, htmlFallback);
    const currentJson = stableStringify(editor.document);
    const nextJson = stableStringify(nextBlocks);
    if (currentJson === nextJson) {
      lastEmittedJsonRef.current = content;
      return;
    }

    isApplyingExternalContentRef.current = true;
    const ids = editor.document.map((b) => b.id);
    editor.replaceBlocks(
      ids,
      asPartialBlocks(
        nextBlocks.length > 0 ? nextBlocks : [{ type: "paragraph", content: [] }]
      )
    );
    lastEmittedJsonRef.current = content;
    isApplyingExternalContentRef.current = false;
  }, [content, htmlFallback, editor]);

  return (
    <div
      className="cb-blocknote-pilot rounded-lg border bg-card shadow-sm overflow-hidden"
      data-editor="blocknote-pilot"
      data-placeholder={placeholder}
    >
      <div className="border-b bg-amber-500/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">
        BlockNote pilot — TipTap remains default
      </div>
      <div className="cb-blocknote-pilot-scroll max-h-[min(70vh,600px)] overflow-auto">
        <BlockNoteView editor={editor} className="cb-blocknote-pilot-view" />
      </div>
      <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-1 text-[11px] text-muted-foreground">
        <span>BlockNote pilot</span>
        <span>Stores TipTap-compatible JSON + HTML</span>
      </div>
    </div>
  );
}
