import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDeploymentProfile } from "@/config/deployment-profile";
import { getModuleManifests } from "@/config/deployment-profile/route-registry";
import { packageManifestFromModule, type PackageManifest } from "@/platform/packages/manifest";

let seedPromise: Promise<void> | null = null;

function includedManifests() {
  const profile = getDeploymentProfile();
  if (!profile.generated) return getModuleManifests();
  return getModuleManifests().filter((manifest) => profile.modules.includes(manifest.id));
}

/**
 * Creates installer rows for packages shipped in this build.
 * A missing site flag is treated as active. An existing disabled flag stays disabled.
 * Failures are left to the caller so a missing table does not hide SiteFeature rows.
 */
export async function ensureBuiltinPackages(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedBuiltinPackages().catch((error: unknown) => {
      seedPromise = null;
      throw error;
    });
  }
  await seedPromise;
}

async function seedBuiltinPackages(): Promise<void> {
  for (const manifest of includedManifests()) {
    const existing = await prisma.packageInstallation.findUnique({
      where: { packageId: manifest.id },
      select: { packageId: true },
    });
    if (existing) continue;
    const feature = await prisma.siteFeature.findUnique({
      where: { kind_featureId: { kind: "module", featureId: manifest.id } },
      select: { enabled: true },
    });
    const active = feature ? feature.enabled : true;
    const record = packageManifestFromModule(manifest);
    await prisma.packageInstallation.create({
      data: {
        packageId: manifest.id,
        kind: record.kind,
        version: record.version,
        status: active ? "active" : "inactive",
        manifest: record as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

export function readStoredManifest(value: Prisma.JsonValue): PackageManifest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.kind !== "string") return null;
  return value as unknown as PackageManifest;
}
