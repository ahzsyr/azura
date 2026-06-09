/** Strip FULLTEXT boolean operators and normalize whitespace. */
export function sanitizeQuery(raw: string): string {
  return raw
    .replace(/[+\-><()~*"@]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lowercase token normalization used by query builder and smart query analysis. */
export function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

export function tokenize(q: string): string[] {
  return sanitizeQuery(q)
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/** InnoDB FULLTEXT boolean mode: prefix match per token. */
export function toBooleanModeQuery(tokens: string[]): string {
  if (!tokens.length) return "";
  return tokens.map((t) => `+${t}*`).join(" ");
}
