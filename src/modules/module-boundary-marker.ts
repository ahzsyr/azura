/**
 * Intentional Module boundary markers for Phase 6 twin-measure scans.
 * Stable string constants survive minification better than path substrings.
 * Presence/absence is a marker-delta claim only — never proven code exclusion.
 */

export function moduleBoundaryMarker(moduleId: string): string {
  return `AZURA_MODULE_BOUNDARY:${moduleId}`;
}

/** Keep a live reference so bundlers retain the string literal. */
export function retainModuleBoundaryMarker(moduleId: string): string {
  const marker = moduleBoundaryMarker(moduleId);
  if (typeof globalThis !== "undefined") {
    const bag = (globalThis as { __AZURA_MODULE_BOUNDARY__?: string[] }).__AZURA_MODULE_BOUNDARY__;
    if (Array.isArray(bag) && !bag.includes(marker)) bag.push(marker);
  }
  return marker;
}
