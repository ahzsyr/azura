import { join } from "node:path";

/** Root for catalog seed fixtures (not read at runtime in cloud-native production). */
export function catalogSeedRoot(): string {
  return join(process.cwd(), "seeds", "catalog");
}

/** Demo profile fixtures used by setup/import scripts only. */
export function demoProfilesSeedRoot(): string {
  return join(process.cwd(), "seeds", "demo-profiles");
}
