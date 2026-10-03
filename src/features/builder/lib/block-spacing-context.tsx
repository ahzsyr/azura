"use client";

import { createContext, useContext, type ReactNode } from "react";

type BlockShellContextValue = {
  ownsSpacing: boolean;
  hasVisualBackground: boolean;
};

const BlockShellContext = createContext<BlockShellContextValue>({
  ownsSpacing: false,
  hasVisualBackground: false,
});

export function BlockSpacingProvider({
  ownsSpacing,
  hasVisualBackground = false,
  children,
}: {
  ownsSpacing: boolean;
  hasVisualBackground?: boolean;
  children: ReactNode;
}) {
  return (
    <BlockShellContext.Provider value={{ ownsSpacing, hasVisualBackground }}>
      {children}
    </BlockShellContext.Provider>
  );
}

export function useBlockOwnsSectionSpacing(): boolean {
  return useContext(BlockShellContext).ownsSpacing;
}

export function useBlockHasVisualBackground(): boolean {
  return useContext(BlockShellContext).hasVisualBackground;
}
