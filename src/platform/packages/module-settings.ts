/**
 * Core Module settings persistence (Phase 3). Registry: module-settings-registry.ts.
 */

import { prisma } from "@/lib/prisma";
import { writeSecurityAuditLog } from "@/lib/security-audit";
import {
  getModuleSettingsDefinition,
  ModuleSettingsError,
  REDACTED_SECRET,
  redactSecrets,
  registerModuleSettings,
  listRegisteredModuleSettingsAdminPaths,
  type ModuleSettingsDefinition,
} from "@/platform/packages/module-settings-registry";

export {
  getModuleSettingsDefinition,
  listRegisteredModuleSettingsAdminPaths,
  ModuleSettingsError,
  REDACTED_SECRET,
  registerModuleSettings,
  type ModuleSettingsDefinition,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeDefaults(
  defaults: Record<string, unknown>,
  stored: Record<string, unknown>,
): Record<string, unknown> {
  return { ...defaults, ...stored };
}

async function loadStoredMap(packageId: string): Promise<Record<string, unknown>> {
  const rows = await prisma.moduleSetting.findMany({
    where: { packageId },
    select: { key: true, value: true },
  });
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    out[row.key] = row.value as unknown;
  }
  if (isPlainObject(out.__root)) {
    return out.__root as Record<string, unknown>;
  }
  const { __root: _drop, ...flat } = out;
  return flat;
}

async function writeRoot(
  packageId: string,
  values: Record<string, unknown>,
  schemaVersion: number,
  updatedBy?: string | null,
): Promise<void> {
  await prisma.moduleSetting.upsert({
    where: { packageId_key: { packageId, key: "__root" } },
    create: {
      packageId,
      key: "__root",
      value: values as object,
      schemaVersion,
      updatedBy: updatedBy ?? null,
    },
    update: {
      value: values as object,
      schemaVersion,
      updatedBy: updatedBy ?? null,
    },
  });
}

export async function getModuleSettings<T = Record<string, unknown>>(
  packageId: string,
): Promise<T> {
  const def = getModuleSettingsDefinition(packageId);
  if (!def) throw new ModuleSettingsError(`No settings registered for “${packageId}”`);
  const stored = await loadStoredMap(packageId);
  const merged = mergeDefaults(def.defaults as Record<string, unknown>, stored);
  const parsed = def.schema.safeParse(merged);
  if (!parsed.success) {
    return def.defaults as T;
  }
  return parsed.data as T;
}

export async function updateModuleSettings(
  packageId: string,
  patch: Record<string, unknown>,
  options?: { updatedBy?: string | null; replaceSecrets?: boolean },
): Promise<Record<string, unknown>> {
  const def = getModuleSettingsDefinition(packageId);
  if (!def) throw new ModuleSettingsError(`No settings registered for “${packageId}”`);

  const current = (await getModuleSettings(packageId)) as Record<string, unknown>;
  const next = { ...current };

  for (const [key, value] of Object.entries(patch)) {
    if (def.secretKeys.includes(key)) {
      if (value === REDACTED_SECRET || value === undefined) continue;
      if ((value === null || value === "") && !options?.replaceSecrets) {
        throw new ModuleSettingsError(
          `Refusing to clear secret “${key}” without replaceSecrets: true`,
        );
      }
      next[key] = value;
      continue;
    }
    next[key] = value;
  }

  const parsed = def.schema.safeParse(next);
  if (!parsed.success) {
    throw new ModuleSettingsError(
      `Invalid settings for “${packageId}”: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    );
  }

  const data = parsed.data as Record<string, unknown>;
  await writeRoot(packageId, data, def.schemaVersion, options?.updatedBy ?? null);
  await writeSecurityAuditLog({
    action: "module.settings.updated",
    actorId: options?.updatedBy ?? null,
    meta: {
      packageId,
      keys: Object.keys(patch).filter(
        (k) => !def.secretKeys.includes(k) || patch[k] !== REDACTED_SECRET,
      ),
      secretKeysTouched: Object.keys(patch).filter(
        (k) => def.secretKeys.includes(k) && patch[k] !== REDACTED_SECRET && patch[k] != null,
      ),
    },
  });
  return data;
}

export async function resetModuleSettings(
  packageId: string,
  options?: { updatedBy?: string | null },
): Promise<Record<string, unknown>> {
  const def = getModuleSettingsDefinition(packageId);
  if (!def) throw new ModuleSettingsError(`No settings registered for “${packageId}”`);
  const defaults = { ...(def.defaults as Record<string, unknown>) };
  for (const key of def.secretKeys) {
    defaults[key] = "";
  }
  await writeRoot(packageId, defaults, def.schemaVersion, options?.updatedBy ?? null);
  await writeSecurityAuditLog({
    action: "module.settings.reset",
    actorId: options?.updatedBy ?? null,
    meta: { packageId, keys: Object.keys(defaults) },
  });
  return defaults;
}

export async function exportModuleSettings(
  packageId: string,
  options?: { redactSecrets?: boolean },
): Promise<Record<string, unknown>> {
  const def = getModuleSettingsDefinition(packageId);
  if (!def) throw new ModuleSettingsError(`No settings registered for “${packageId}”`);
  const values = (await getModuleSettings(packageId)) as Record<string, unknown>;
  const redact = options?.redactSecrets !== false;
  return redact ? redactSecrets(values, def.secretKeys) : values;
}

export async function importModuleSettings(
  packageId: string,
  incoming: Record<string, unknown>,
  options?: { updatedBy?: string | null; replaceSecrets?: boolean },
): Promise<Record<string, unknown>> {
  const def = getModuleSettingsDefinition(packageId);
  if (!def) throw new ModuleSettingsError(`No settings registered for “${packageId}”`);
  const patch: Record<string, unknown> = { ...incoming };
  for (const key of def.secretKeys) {
    if (patch[key] === REDACTED_SECRET) {
      delete patch[key];
    }
    if ((patch[key] === null || patch[key] === "") && !options?.replaceSecrets) {
      delete patch[key];
    }
  }
  return updateModuleSettings(packageId, patch, options);
}
