import {
  normalizeForMatch,
  matchesExact,
  matchesContains,
  matchesStartsWith,
} from "@/features/collections/normalization";

export {
  normalizeForMatch,
  matchesExact,
  matchesContains,
  matchesStartsWith,
  normalizeSlug,
} from "@/features/collections/normalization";

export function matchesEndsWith(value: string, suffix: string): boolean {
  return normalizeForMatch(value).endsWith(normalizeForMatch(suffix));
}

export function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function toStringList(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((v) => (v == null ? "" : String(v).trim())).filter(Boolean);
  }
  const s = String(value).trim();
  return s ? [s] : [];
}

export function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const n = value.trim().toLowerCase();
    if (n === "true" || n === "1" || n === "yes") return true;
    if (n === "false" || n === "0" || n === "no") return false;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return null;
}
