import { SEO_DESCRIPTION_LENGTH } from "@/features/seo/scoring/seo-scoring.service";
import type { ContentSnapshot } from "../../types";

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Joins snapshot body text for meta description generation. */
export function extractPageText(snapshot: ContentSnapshot): string {
  const parts = [
    ...snapshot.paragraphs,
    ...snapshot.headings.filter((h) => h.level > 1).map((h) => h.text),
    ...snapshot.faq.flatMap((item) => [item.question, item.answer]),
  ];
  return collapseWhitespace(parts.map((part) => part.trim()).filter(Boolean).join(" "));
}

/** First ~N words of page body for topic-evidence checks (title/H1/opening only). */
export function extractOpeningExcerpt(snapshot: ContentSnapshot, maxWords = 150): string {
  const body = snapshot.paragraphs.map((p) => p.trim()).filter(Boolean).join(" ");
  const collapsed = collapseWhitespace(body);
  if (!collapsed) return "";
  const words = collapsed.split(" ");
  if (words.length <= maxWords) return collapsed;
  return words.slice(0, maxWords).join(" ");
}

/**
 * Builds meta description text from page content. When base extracted text is shorter
 * than the SEO minimum, augments with all headings (including H1) and table cells.
 */
export function buildMetaDescriptionFromSnapshot(
  snapshot: ContentSnapshot,
  minLength: number = SEO_DESCRIPTION_LENGTH.min,
): string {
  const base = extractPageText(snapshot) || snapshot.paragraphs[0]?.trim() || "";
  if (base.length >= minLength) return base;

  const extraParts = [
    ...snapshot.headings.map((h) => h.text),
    ...snapshot.tables.flat().map((cell) => cell.trim()).filter(Boolean),
  ];

  const combined = collapseWhitespace([base, ...extraParts].filter(Boolean).join(" "));
  return combined || base;
}
