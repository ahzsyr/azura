import type { SchemaVersionFlag } from "../types";

export type SchemaVersionRegistry = {
  list(): SchemaVersionFlag[];
  getActive(): SchemaVersionFlag | null;
  enable(version: number, options?: { shadowMode?: boolean }): SchemaVersionFlag;
  disable(version: number): void;
};

export function createSchemaVersionRegistry(
  initial: SchemaVersionFlag[] = [{ version: 1, enabled: true, shadowMode: true }],
): SchemaVersionRegistry {
  const versions = new Map<number, SchemaVersionFlag>();
  for (const flag of initial) versions.set(flag.version, { ...flag });

  return {
    list() {
      return [...versions.values()].sort((a, b) => a.version - b.version);
    },
    getActive() {
      return [...versions.values()].find((v) => v.enabled) ?? null;
    },
    enable(version, options) {
      for (const [key, flag] of versions) {
        versions.set(key, { ...flag, enabled: key === version });
      }
      const current = versions.get(version) ?? { version, enabled: true, shadowMode: true };
      const next = {
        ...current,
        enabled: true,
        shadowMode: options?.shadowMode ?? current.shadowMode ?? false,
      };
      versions.set(version, next);
      return next;
    },
    disable(version) {
      const current = versions.get(version);
      if (!current) return;
      versions.set(version, { ...current, enabled: false });
    },
  };
}
