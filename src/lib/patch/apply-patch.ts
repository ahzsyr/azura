/**
 * Merge patch into base. Objects deep-merge; arrays replace atomically (v1).
 */
export function applyPatch<T>(base: T, changes: Partial<T> | Record<string, unknown>): T {
  if (changes === null || typeof changes !== "object" || Array.isArray(changes)) {
    return changes as T;
  }
  if (base === null || typeof base !== "object" || Array.isArray(base)) {
    return structuredClone(changes) as T;
  }

  const result = { ...(base as Record<string, unknown>) };
  const patch = changes as Record<string, unknown>;

  for (const key of Object.keys(patch)) {
    const patchVal = patch[key];
    const baseVal = result[key];

    if (patchVal === undefined) continue;

    if (Array.isArray(patchVal)) {
      result[key] = structuredClone(patchVal);
      continue;
    }

    if (
      patchVal !== null &&
      typeof patchVal === "object" &&
      baseVal !== null &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      result[key] = applyPatch(baseVal, patchVal as Record<string, unknown>);
      continue;
    }

    result[key] = structuredClone(patchVal);
  }

  return result as T;
}
