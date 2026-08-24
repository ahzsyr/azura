import {
  CAPABILITY_DEPENDENCIES,
  type CapabilityAvailability,
  type MarketingCapabilityId,
} from "./types";

export function getCapabilityDependencies(
  capability: MarketingCapabilityId,
): MarketingCapabilityId[] {
  return CAPABILITY_DEPENDENCIES[capability] ?? [];
}

export function resolveCapabilityAvailability(params: {
  capability: MarketingCapabilityId;
  supported: Iterable<MarketingCapabilityId>;
  enabled: Iterable<MarketingCapabilityId>;
}): CapabilityAvailability {
  const supported = new Set(params.supported);
  const enabled = new Set(params.enabled);

  if (!supported.has(params.capability)) {
    return {
      capability: params.capability,
      available: false,
      reason: "unsupported",
    };
  }

  if (!enabled.has(params.capability)) {
    return {
      capability: params.capability,
      available: false,
      reason: "featureFlagDisabled",
    };
  }

  const missingDependencies = getCapabilityDependencies(params.capability).filter(
    (dep) => !enabled.has(dep) || !supported.has(dep),
  );

  if (missingDependencies.length > 0) {
    return {
      capability: params.capability,
      available: false,
      reason: "missingDependency",
      missingDependencies,
    };
  }

  return { capability: params.capability, available: true };
}

export {
  CAPABILITY_DEPENDENCIES,
  MARKETING_CAPABILITIES,
  type CapabilityAvailability,
  type CapabilityBlockReason,
  type MarketingCapabilityId,
} from "./types";
