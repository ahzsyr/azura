"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { initializeSchemaUiPlatform } from "../init-platform";

type SchemaUiContextValue = {
  ready: boolean;
};

const SchemaUiContext = createContext<SchemaUiContextValue>({ ready: false });

let providerBootstrapped = false;

function ensureInit() {
  if (providerBootstrapped) return;
  initializeSchemaUiPlatform();
  providerBootstrapped = true;
}

/**
 * Guarantees schema-ui registries are initialized exactly once for the subtree.
 * Wrap admin form designer (and any client schema-ui consumer) with this provider.
 */
export function SchemaUiProvider({ children }: { children: ReactNode }) {
  ensureInit();
  const value = useMemo(() => ({ ready: true }), []);
  return <SchemaUiContext.Provider value={value}>{children}</SchemaUiContext.Provider>;
}

export function useSchemaUiReady(): boolean {
  return useContext(SchemaUiContext).ready;
}
