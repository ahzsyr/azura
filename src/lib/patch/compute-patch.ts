import { deepEqual } from "./deep-equal";

export type ComputePatchOptions = {
  /** Treat array changes as atomic (replace entire array). Default true. */
  atomicArrays?: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Deep diff: returns only fields that changed between original and current.
 * Arrays are atomic in v1 — any element change includes the full array.
 */
export function computePatch<T extends Record<string, unknown>>(
  original: T,
  current: T,
  options: ComputePatchOptions = {},
): Partial<T> {
  const atomicArrays = options.atomicArrays !== false;
  const patch: Record<string, unknown> = {};

  const allKeys = new Set([...Object.keys(original), ...Object.keys(current)]);

  for (const key of allKeys) {
    const origVal = original[key];
    const currVal = current[key];

    if (deepEqual(origVal, currVal)) continue;

    if (atomicArrays && (Array.isArray(origVal) || Array.isArray(currVal))) {
      patch[key] = structuredClone(currVal);
      continue;
    }

    if (isPlainObject(origVal) && isPlainObject(currVal)) {
      const nested = computePatch(origVal, currVal, options);
      if (Object.keys(nested).length > 0) {
        patch[key] = nested;
      }
      continue;
    }

    patch[key] = structuredClone(currVal);
  }

  return patch as Partial<T>;
}

export function isEmptyPatch(changes: unknown): boolean {
  if (changes === null || changes === undefined) return true;
  if (typeof changes !== "object") return false;
  if (Array.isArray(changes)) return changes.length === 0;
  return Object.keys(changes as Record<string, unknown>).length === 0;
}
