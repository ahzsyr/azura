"use client";

import { createContext, useContext, type ReactNode } from "react";

const BlockSpacingContext = createContext(false);

export function BlockSpacingProvider({
  ownsSpacing,
  children,
}: {
  ownsSpacing: boolean;
  children: ReactNode;
}) {
  return (
    <BlockSpacingContext.Provider value={ownsSpacing}>{children}</BlockSpacingContext.Provider>
  );
}

export function useBlockOwnsSectionSpacing(): boolean {
  return useContext(BlockSpacingContext);
}
