import { sanitizeQuery } from "./sanitize";

export function excerpt(body: string, query: string, maxLen = 120): string {
  const lower = body.toLowerCase();
  const q = sanitizeQuery(query).toLowerCase();
  const idx = q ? lower.indexOf(q.split(/\s+/)[0] ?? "") : -1;
  if (idx < 0) return body.slice(0, maxLen) + (body.length > maxLen ? "…" : "");
  const start = Math.max(0, idx - 40);
  const slice = body.slice(start, start + maxLen);
  return (start > 0 ? "…" : "") + slice + (start + maxLen < body.length ? "…" : "");
}

/** Highlight query tokens in text for result card display. */
export function highlightMatches(text: string, query: string): string {
  const tokens = sanitizeQuery(query)
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (!tokens.length) return text;
  let result = text;
  for (const token of tokens) {
    const re = new RegExp(`(${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    result = result.replace(re, "<mark>$1</mark>");
  }
  return result;
}
