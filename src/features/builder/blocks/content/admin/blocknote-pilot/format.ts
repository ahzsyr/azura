/**
 * Format detectors for TipTap vs BlockNote stored payloads (no BlockNote/TipTap runtime).
 */

export type TipTapDoc = { type: "doc"; content?: unknown[] };

export type BlockNoteDocument = Array<{
  type: string;
  id?: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: unknown[];
  [key: string]: unknown;
}>;

export type BlockNoteEnvelope = {
  format: "blocknote";
  version: 1;
  blocks: BlockNoteDocument;
};

export function isTipTapDoc(value: unknown): value is TipTapDoc {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as TipTapDoc).type === "doc"
  );
}

export function isBlockNoteEnvelope(value: unknown): value is BlockNoteEnvelope {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as BlockNoteEnvelope).format === "blocknote" &&
    Array.isArray((value as BlockNoteEnvelope).blocks)
  );
}

export function isBlockNoteDocument(value: unknown): value is BlockNoteDocument {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return true;
  const first = value[0];
  return (
    !!first &&
    typeof first === "object" &&
    typeof (first as { type?: unknown }).type === "string" &&
    ("props" in (first as object) || "content" in (first as object) || "children" in (first as object))
  );
}

export function parseStoredContent(raw: string): unknown {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}
