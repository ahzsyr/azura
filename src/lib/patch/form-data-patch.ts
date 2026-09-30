import "server-only";

import { applyPatch, isEmptyPatch } from "@/lib/patch";

export type EntityPatchResult<T> =
  | { ok: true; noop?: boolean; entity: T }
  | { ok: false; error: string };

export async function mergeAndPatch<T extends Record<string, unknown>, R>(
  baseline: T,
  changes: Record<string, unknown>,
  apply: (merged: T) => Promise<R>,
): Promise<EntityPatchResult<R>> {
  if (isEmptyPatch(changes)) {
    return { ok: true, noop: true, entity: baseline as unknown as R };
  }
  const merged = applyPatch(baseline, changes) as T;
  const entity = await apply(merged);
  return { ok: true, entity };
}

/** Serialize form fields to a plain object (string values). Client-safe duplicate in form-serialize.ts */
export function serializeFormDataObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}
