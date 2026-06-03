/** Strip FULLTEXT boolean operators and normalize whitespace. */
export function sanitizeQuery(raw: string): string {
  return raw
    .replace(/[+\-><()~*"@]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(q: string): string[] {
  return sanitizeQuery(q)
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

export function hasArabicScript(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/** InnoDB FULLTEXT boolean mode: prefix match per token. */
export function toBooleanModeQuery(tokens: string[]): string {
  if (!tokens.length) return "";
  return tokens.map((t) => `+${t}*`).join(" ");
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

export function typoScore(query: string, target: string, maxDistance = 2): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 0;
  const qTokens = tokenize(q);
  if (!qTokens.length) return 99;
  const perToken = qTokens.map((qt) => {
    const words = t.split(/\s+/);
    if (!words.length) return levenshtein(qt, t);
    return Math.min(...words.map((w) => levenshtein(qt, w)));
  });
  const avg = perToken.reduce((a, b) => a + b, 0) / perToken.length;
  return avg > maxDistance ? 99 : avg;
}

/** 0–1 similarity from token-level edit distance (higher = closer match). */
export function fuzzySimilarity(
  tokens: string[],
  text: string,
  maxDistance: number
): number {
  if (!text.trim() || !tokens.length || maxDistance <= 0) return 0;
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return 0;

  const perToken = tokens.map((qt) => {
    const q = qt.toLowerCase();
    if (text.toLowerCase().includes(q)) return 1;
    const bestDist = Math.min(...words.map((w) => levenshtein(q, w)), levenshtein(q, text.toLowerCase()));
    if (bestDist > maxDistance) return 0;
    return 1 - bestDist / (maxDistance + 1);
  });

  return perToken.reduce((a, b) => a + b, 0) / perToken.length;
}

/** Prefix and substring partial match strength (0–1). */
export function partialMatchScore(tokens: string[], text: string): number {
  if (!text.trim() || !tokens.length) return 0;
  const lower = text.toLowerCase();
  const hits = tokens.filter((tok) => {
    const t = tok.toLowerCase();
    if (t.length < 2) return lower.includes(t);
    if (lower.includes(t)) return true;
    return lower.split(/\s+/).some((w) => w.startsWith(t) || t.startsWith(w));
  });
  return hits.length / tokens.length;
}

/** Multi-keyword coverage: all tokens must match vs any token. */
export function multiKeywordScore(
  tokens: string[],
  text: string,
  mode: "all" | "any"
): number {
  if (!text.trim() || !tokens.length) return 0;
  const lower = text.toLowerCase();
  const matched = tokens.filter((tok) => lower.includes(tok.toLowerCase()));
  if (mode === "all") {
    return matched.length === tokens.length ? 1 : matched.length / tokens.length;
  }
  return matched.length / tokens.length;
}

/** Bonus for exact phrase or title equality. */
export function exactMatchBoost(
  phraseQuery: string,
  title: string,
  body: string,
  boost: number
): number {
  const q = phraseQuery.toLowerCase().trim();
  if (!q || boost <= 0) return 0;
  const t = title.toLowerCase().trim();
  const b = body.toLowerCase();
  if (t === q) return boost * 2;
  if (t.includes(q)) return boost;
  if (b.includes(q)) return boost * 0.45;
  return 0;
}

export function excerpt(body: string, query: string, maxLen = 120): string {
  const lower = body.toLowerCase();
  const q = sanitizeQuery(query).toLowerCase();
  const idx = q ? lower.indexOf(q.split(/\s+/)[0] ?? "") : -1;
  if (idx < 0) return body.slice(0, maxLen) + (body.length > maxLen ? "…" : "");
  const start = Math.max(0, idx - 40);
  const slice = body.slice(start, start + maxLen);
  return (start > 0 ? "…" : "") + slice + (start + maxLen < body.length ? "…" : "");
}
