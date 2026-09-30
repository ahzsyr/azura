/** Flatten arbitrary JSON into searchable plain text (capped). O(n) char accumulator. */
export function flattenJsonToText(value: unknown, maxLen = 12_000): string {
  const parts: string[] = [];
  let charCount = 0;

  function walk(v: unknown): void {
    if (charCount >= maxLen) return;
    if (v == null) return;
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length > 1) {
        parts.push(t);
        charCount += t.length + 1;
      }
      return;
    }
    if (typeof v === "number" || typeof v === "boolean") {
      const s = String(v);
      parts.push(s);
      charCount += s.length + 1;
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v) walk(x);
      return;
    }
    if (typeof v === "object") {
      for (const x of Object.values(v as Record<string, unknown>)) walk(x);
    }
  }

  walk(value);
  const out = parts.join(" ").replace(/\s+/g, " ").trim();
  return out.length > maxLen ? out.slice(0, maxLen) : out;
}

export function stringifyIndexValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(stringifyIndexValue).filter(Boolean).join(" ");
  }
  if (typeof value === "object") return flattenJsonToText(value, 4000);
  return "";
}

export function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => stringifyIndexValue(v)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,;|]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}
