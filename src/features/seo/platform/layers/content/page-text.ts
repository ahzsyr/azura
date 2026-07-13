import type { ContentSnapshot } from "../../types";

/** Joins snapshot body text for meta description generation. */
export function extractPageText(snapshot: ContentSnapshot): string {
  const parts = [
    ...snapshot.paragraphs,
    ...snapshot.headings.filter((h) => h.level > 1).map((h) => h.text),
    ...snapshot.faq.flatMap((item) => [item.question, item.answer]),
  ];
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
