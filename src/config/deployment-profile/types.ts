export const DEPLOYMENT_PROFILE_IDS = [
  "marketing",
  "showroom",
  "agency",
  "tourism",
  "documentation",
  "enterprise",
] as const;

export type DeploymentProfileId = (typeof DEPLOYMENT_PROFILE_IDS)[number];

export type CompiledDeploymentProfile = {
  generated: boolean;
  profileId: DeploymentProfileId;
  label: string;
  description: string;
  core: string[];
  capabilities: string[];
  experience: string[];
  presets: string[];
  modules: string[];
  enabledNavItemIds: string[];
  enabledAdminHrefs: string[];
  disabledAdminPrefixes: string[];
  disabledPublicSegments: string[];
  disabledApiPrefixes: string[];
};
