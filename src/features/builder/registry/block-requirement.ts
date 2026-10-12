export type BlockRequirement = {
  module?: string;
  preset?: string;
  capability?: string;
};

export type BlockAvailabilityProfile = {
  modules?: readonly string[];
  presets?: readonly string[];
  capabilities?: readonly string[];
};

/** True when a block's module, preset, and capability are all present on the profile. */
export function isBlockRequirementMet(
  requires: BlockRequirement | undefined,
  profile: BlockAvailabilityProfile,
): boolean {
  if (!requires) return true;
  const modules = profile.modules ?? [];
  const presets = profile.presets ?? [];
  const capabilities = profile.capabilities ?? [];
  return (
    (!requires.module || modules.includes(requires.module)) &&
    (!requires.preset || presets.includes(requires.preset)) &&
    (!requires.capability || capabilities.includes(requires.capability))
  );
}
