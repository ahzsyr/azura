import { tokenizeForSearch } from "./semantics";

/** Strip FULLTEXT boolean operators and normalize whitespace. */
export function sanitizeQuery(raw: string): string {
  return raw
    .replace(/[+\-><()~*"@]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lowercase token normalization used by query builder and smart query analysis. */
export function normalizeToken(token: string): string {
  return tokenizeForSearch(token, { minTokenLength: 1 })[0] ?? "";
}

export function tokenize(q: string): string[] {
  return tokenizeForSearch(sanitizeQuery(q));
}

/** InnoDB FULLTEXT boolean mode: prefix match per token. */
export function toBooleanModeQuery(tokens: string[]): string {
  if (!tokens.length) return "";
  return tokens.map((t) => `+${t}*`).join(" ");
}

/** Normalize query text for matching. */
export function normalizeForMatch(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.toLowerCase();
}
