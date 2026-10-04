/**
 * Serializer adapters for Phase 1.5 BlockNote pilot:
 *   TipTap JSON/HTML ↔ BlockNote document ↔ HTML (public render)
 *
 * Storage contract (pilot): keep emitting TipTap-compatible JSON in `content`
 * so flipping the flag off does not brick the TipTap editor. Public surfaces
 * continue to read `html` via AdvancedRichTextView.
 */

import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { generateHTML, generateJSON, type JSONContent } from "@tiptap/core";
import { createAdvancedRichTextExtensions } from "@/features/builder/blocks/content/admin/advanced-rich-text-extensions";
import {
  isBlockNoteDocument,
  isBlockNoteEnvelope,
  isTipTapDoc,
  parseStoredContent,
  type BlockNoteDocument,
  type BlockNoteEnvelope,
  type TipTapDoc,
} from "@/features/builder/blocks/content/admin/blocknote-pilot/format";
import { stableStringify } from "@/features/builder/blocks/content/admin/blocknote-pilot/stable-json";

export type { BlockNoteDocument, BlockNoteEnvelope, TipTapDoc };
export {
  isBlockNoteDocument,
  isBlockNoteEnvelope,
  isTipTapDoc,
  parseStoredContent,
};

let tipTapExtensionsCache: ReturnType<typeof createAdvancedRichTextExtensions> | null = null;
let headlessBlockNote: BlockNoteEditor | null = null;

function tipTapExtensions() {
  tipTapExtensionsCache ??= createAdvancedRichTextExtensions();
  return tipTapExtensionsCache;
}

function getHeadlessBlockNote(): BlockNoteEditor {
  headlessBlockNote ??= BlockNoteEditor.create({
    animations: false,
    defaultStyles: false,
  });
  return headlessBlockNote;
}

function asPartialBlocks(blocks: BlockNoteDocument): PartialBlock[] {
  return blocks as PartialBlock[];
}

function asBlockNoteDocument(blocks: PartialBlock[]): BlockNoteDocument {
  return blocks as BlockNoteDocument;
}

/** TipTap ProseMirror JSON → HTML (uses Azura advanced-rich-text extensions). */
export function tipTapJsonToHtml(doc: TipTapDoc): string {
  try {
    return generateHTML(doc as JSONContent, tipTapExtensions());
  } catch {
    return "";
  }
}

/** HTML → TipTap ProseMirror JSON (lossy for unsupported tags). */
export function htmlToTipTapJson(html: string): TipTapDoc {
  const safe = html?.trim() ? html : "<p></p>";
  try {
    return generateJSON(safe, tipTapExtensions()) as TipTapDoc;
  } catch {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
}

/** BlockNote document → HTML for public render (lossy for unsupported styles). */
export function blockNoteDocumentToHtml(blocks: BlockNoteDocument): string {
  try {
    return getHeadlessBlockNote().blocksToHTMLLossy(asPartialBlocks(blocks));
  } catch {
    return "";
  }
}

/** HTML → BlockNote document (lossy). */
export function htmlToBlockNoteDocument(html: string): BlockNoteDocument {
  const safe = html?.trim() ? html : "<p></p>";
  try {
    return asBlockNoteDocument(getHeadlessBlockNote().tryParseHTMLToBlocks(safe));
  } catch {
    return [{ type: "paragraph", content: [] }];
  }
}

/** TipTap JSON → BlockNote via HTML bridge. */
export function tipTapJsonToBlockNoteDocument(doc: TipTapDoc): BlockNoteDocument {
  return htmlToBlockNoteDocument(tipTapJsonToHtml(doc));
}

/** BlockNote → TipTap JSON via HTML bridge (storage-compatible with TipTap default). */
export function blockNoteDocumentToTipTapJson(blocks: BlockNoteDocument): TipTapDoc {
  return htmlToTipTapJson(blockNoteDocumentToHtml(blocks));
}

/**
 * Resolve editor initial blocks from stored TipTap JSON and/or HTML.
 * Prefers native BlockNote envelope when present; otherwise HTML/TipTap bridge.
 */
export function storedContentToBlockNoteDocument(
  contentJson: string,
  htmlFallback = ""
): BlockNoteDocument {
  const parsed = parseStoredContent(contentJson);

  if (isBlockNoteEnvelope(parsed)) {
    return parsed.blocks;
  }
  if (isBlockNoteDocument(parsed)) {
    return parsed;
  }
  if (isTipTapDoc(parsed)) {
    const fromTipTap = tipTapJsonToBlockNoteDocument(parsed);
    if (fromTipTap.length > 0) return fromTipTap;
  }

  if (htmlFallback.trim()) {
    return htmlToBlockNoteDocument(htmlFallback);
  }

  if (typeof contentJson === "string" && contentJson.trim().startsWith("<")) {
    return htmlToBlockNoteDocument(contentJson);
  }

  return [{ type: "paragraph", content: [] }];
}

/**
 * Emit TipTap-compatible JSON + HTML for the existing advanced-rich-text field path.
 * Also exposes a BlockNote envelope string for future dual-write / evaluation.
 */
export function blockNoteDocumentToStoredPayload(blocks: BlockNoteDocument): {
  tipTapJson: string;
  html: string;
  blockNoteEnvelopeJson: string;
} {
  const html = blockNoteDocumentToHtml(blocks);
  const tipTapDoc = htmlToTipTapJson(html);
  const envelope: BlockNoteEnvelope = {
    format: "blocknote",
    version: 1,
    blocks,
  };

  return {
    tipTapJson: stableStringify(tipTapDoc),
    html,
    blockNoteEnvelopeJson: stableStringify(envelope),
  };
}
