/**
 * Pure Module settings registry (no Prisma / server-only).
 */

import { z } from "zod";

export const REDACTED_SECRET = "[redacted]";

export type ModuleSettingsDefinition<T extends z.ZodTypeAny = z.ZodTypeAny> = {
  packageId: string;
  schemaVersion: number;
  schema: T;
  defaults: z.infer<T>;
  secretKeys: readonly string[];
  adminPath?: string;
};

type AnyDefinition = ModuleSettingsDefinition<z.ZodTypeAny>;

const registry = new Map<string, AnyDefinition>();

export class ModuleSettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModuleSettingsError";
  }
}

export function registerModuleSettings<T extends z.ZodTypeAny>(
  definition: ModuleSettingsDefinition<T>,
): void {
  if (!definition.packageId.trim()) {
    throw new ModuleSettingsError("packageId is required");
  }
  registry.set(definition.packageId, definition as AnyDefinition);
}

export function getModuleSettingsDefinition(packageId: string): AnyDefinition | null {
  return registry.get(packageId) ?? null;
}

export function listRegisteredModuleSettingsAdminPaths(): {
  packageId: string;
  adminPath: string;
}[] {
  const out: { packageId: string; adminPath: string }[] = [];
  for (const def of registry.values()) {
    if (def.adminPath) out.push({ packageId: def.packageId, adminPath: def.adminPath });
  }
  return out;
}

export function redactSecrets(
  values: Record<string, unknown>,
  secretKeys: readonly string[],
): Record<string, unknown> {
  const next = { ...values };
  for (const key of secretKeys) {
    if (key in next && next[key] != null && next[key] !== "") {
      next[key] = REDACTED_SECRET;
    }
  }
  return next;
}
