/** Flatten a patch object into dot-notation leaf paths. */
export function flattenPatchPaths(
  changes: Record<string, unknown>,
  prefix = "",
): string[] {
  const paths: string[] = [];

  for (const key of Object.keys(changes)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = changes[key];

    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value as Record<string, unknown>).length > 0
    ) {
      paths.push(...flattenPatchPaths(value as Record<string, unknown>, path));
    } else {
      paths.push(path);
    }
  }

  return paths;
}

export type SectionMapEntry = {
  prefix: string;
  label: string;
};

/**
 * Map flattened patch paths to human-readable section labels.
 * Uses longest matching prefix from sectionMap.
 */
export function getChangedSections(
  paths: string[],
  sectionMap: SectionMapEntry[],
): string[] {
  if (paths.length === 0 || sectionMap.length === 0) return [];

  const sorted = [...sectionMap].sort((a, b) => b.prefix.length - a.prefix.length);
  const sections = new Set<string>();

  for (const path of paths) {
    const match = sorted.find(
      (entry) => path === entry.prefix || path.startsWith(`${entry.prefix}.`),
    );
    sections.add(match?.label ?? "General");
  }

  return [...sections];
}

/** Count leaf paths in a patch (same as flattenPatchPaths length). */
export function countPatchFields(changes: Record<string, unknown>): number {
  return flattenPatchPaths(changes).length;
}
