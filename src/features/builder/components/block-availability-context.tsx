"use client";

import { createContext, useContext, type ReactNode } from "react";
import { getDeploymentProfile } from "@/config/deployment-profile";
import type { BlockAvailabilityProfile } from "@/features/builder/registry/block-requirement";

const BlockAvailabilityContext = createContext<BlockAvailabilityProfile | null>(null);

export function BlockAvailabilityProvider({
  value,
  children,
}: {
  value: BlockAvailabilityProfile;
  children: ReactNode;
}) {
  return <BlockAvailabilityContext.Provider value={value}>{children}</BlockAvailabilityContext.Provider>;
}

/** Effective profile from the server editor, or the compiled profile when none was passed. */
export function useBlockAvailability(): BlockAvailabilityProfile {
  return useContext(BlockAvailabilityContext) ?? getDeploymentProfile();
}
