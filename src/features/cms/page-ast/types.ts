/**
 * Versioned Page AST — typed envelope for CMS page compositions.
 * Leaf rich-text remains TipTap JSON/HTML (or BlockNote pilot) inside block props.
 * Macro layout stays Azura Composition + Block Registry.
 *
 * Lifecycle status (DRAFT / PUBLISHED) belongs on the CMS entity / revision pointers,
 * never inside this envelope.
 */
import type { Composition } from "@/features/layout-engine/types";
import type { PageBlocks } from "@/types/builder";

/** Bump when the envelope shape changes incompatibly. */
export const PAGE_AST_VERSION = 1 as const;

export type PageAstLeafContent = {
  /** TipTap / BlockNote JSON string or document */
  json?: unknown;
  /** Sanitized HTML for public render */
  html?: string;
};

export type PageAstDocument = {
  version: typeof PAGE_AST_VERSION | number;
  /** Layout + region block trees */
  composition: Composition;
  /** Flat block list (legacy / co-stored with composition) */
  blocks?: PageBlocks;
  /** Optional document metadata (not lifecycle status) */
  meta?: {
    locale?: string;
    label?: string;
    [key: string]: unknown;
  };
};

export function isPageAstDocument(value: unknown): value is PageAstDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const doc = value as Record<string, unknown>;
  return (
    typeof doc.version === "number" &&
    typeof doc.composition === "object" &&
    doc.composition !== null &&
    !Array.isArray(doc.composition)
  );
}

export function wrapCompositionAsPageAst(
  composition: Composition,
  options?: {
    blocks?: PageBlocks;
    meta?: PageAstDocument["meta"];
  },
): PageAstDocument {
  return {
    version: PAGE_AST_VERSION,
    composition,
    blocks: options?.blocks,
    meta: options?.meta,
  };
}
