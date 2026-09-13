import type { CanonicalSpecRecord } from "./types";

/** Read canonical_specs from a product payload (client-safe; no registry/fs). */
export function getCanonicalSpecsMap(
  product: {
    canonical_specs?: Record<string, CanonicalSpecRecord | string>;
    specifications?: unknown;
  },
): Record<string, CanonicalSpecRecord> {
  const raw = product.canonical_specs;
  if (raw && typeof raw === "object" && Object.keys(raw).length > 0) {
    const out: Record<string, CanonicalSpecRecord> = {};
    for (const [id, entry] of Object.entries(raw)) {
      if (typeof entry === "string") {
        out[id] = { value: entry, display: entry };
      } else if (entry && typeof entry === "object") {
        out[id] = entry;
      }
    }
    return out;
  }
  return {};
}
