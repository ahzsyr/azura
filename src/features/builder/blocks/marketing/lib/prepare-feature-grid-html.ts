import { adaptRichTextHtmlColors } from "@/features/builder/blocks/content/lib/adapt-rich-text-colors";
import { sanitizeHtmlStructural } from "@/lib/sanitize-html";

/**
 * Sanitize + theme-adapt description HTML for Feature Grid cards.
 * Uses a string-only pipeline (no isomorphic-dompurify) so SSR and client match (#418).
 */
export function prepareFeatureGridDescriptionHtml(rawHtml: string): string {
  const trimmed = rawHtml.trim();
  if (!trimmed) return "";
  return adaptRichTextHtmlColors(sanitizeHtmlStructural(trimmed));
}
