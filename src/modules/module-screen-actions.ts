"use server";

import { revalidatePath } from "next/cache";
import { getDeploymentProfile } from "@/config/deployment-profile";
import {
  SiteFeatureUpdateError,
  updateSiteFeatures,
  type SiteFeatureKind,
} from "@/config/deployment-profile/site-features";
import { requireAdmin } from "@/features/auth/guards";
import { activatePackage, deactivatePackage, PackageInstallerError } from "@/platform/packages/installer";
import { auditPackageLifecycle } from "@/platform/packages/package-lifecycle-audit";
import {
  preflightPackageOperation,
  type PackagePreflightResult,
} from "@/platform/packages/package-preflight";

export type SetSiteFeatureResult = { ok: true } | { ok: false; error: string };

function errorMessage(error: unknown): string {
  if (error instanceof SiteFeatureUpdateError || error instanceof PackageInstallerError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Could not save this package";
}

/** Dry-run before Enable / Disable on Modules Manager (admin). */
export async function preflightModuleToggle(
  featureId: string,
  enabled: boolean,
): Promise<PackagePreflightResult> {
  await requireAdmin();
  return preflightPackageOperation(featureId, enabled ? "activate" : "deactivate");
}

export async function setSiteFeatureEnabled(
  kind: SiteFeatureKind,
  featureId: string,
  enabled: boolean,
): Promise<SetSiteFeatureResult> {
  await requireAdmin();
  const profile = getDeploymentProfile();
  if (!profile.generated) {
    return { ok: false, error: "A deployment profile has not been generated." };
  }
  const allowed = kind === "module" ? profile.modules : profile.presets;
  if (!allowed.includes(featureId)) {
    return { ok: false, error: `${kind} ${featureId} is not included in the deployment profile` };
  }
  try {
    if (kind === "module") {
      if (enabled) await activatePackage(featureId);
      else await deactivatePackage(featureId);
      await auditPackageLifecycle({
        op: enabled ? "activate" : "deactivate",
        packageId: featureId,
        ok: true,
      });
    } else {
      await updateSiteFeatures([{ kind, featureId, enabled }]);
    }
  } catch (error) {
    const reason = errorMessage(error);
    if (kind === "module") {
      await auditPackageLifecycle({
        op: enabled ? "activate" : "deactivate",
        packageId: featureId,
        ok: false,
        reason,
      });
    }
    return { ok: false, error: reason };
  }
  revalidatePath("/admin/modules");
  revalidatePath("/admin");
  return { ok: true };
}
