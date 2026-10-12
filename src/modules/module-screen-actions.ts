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

export type SetSiteFeatureResult = { ok: true } | { ok: false; error: string };

function errorMessage(error: unknown): string {
  if (error instanceof SiteFeatureUpdateError || error instanceof PackageInstallerError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Could not save this package";
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
    } else {
      await updateSiteFeatures([{ kind, featureId, enabled }]);
    }
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
  revalidatePath("/admin/modules");
  revalidatePath("/admin");
  return { ok: true };
}
