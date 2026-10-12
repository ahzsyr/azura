"use server";

import { revalidatePath } from "next/cache";
import { getDeploymentProfile } from "@/config/deployment-profile";
import {
  SiteFeatureUpdateError,
  updateSiteFeatures,
  type SiteFeatureKind,
} from "@/config/deployment-profile/site-features";
import { requireAdmin } from "@/features/auth/guards";

export type SetSiteFeatureResult = { ok: true } | { ok: false; error: string };

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
    await updateSiteFeatures([{ kind, featureId, enabled }]);
  } catch (error) {
    if (error instanceof SiteFeatureUpdateError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
  revalidatePath("/admin/modules");
  return { ok: true };
}
