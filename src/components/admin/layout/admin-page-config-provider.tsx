"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AdminPageConfig } from "@/config/admin-page-config";

type AdminPageConfigContextValue = {
  config: AdminPageConfig | null;
  setConfig: (config: AdminPageConfig | null) => void;
};

const AdminPageConfigContext = createContext<AdminPageConfigContextValue | null>(null);

/**
 * Provides empty page-config context. AdminShell mounts this;
 * individual pages call useRegisterAdminPageConfig — the shell does not discover routes.
 */
export function AdminPageConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AdminPageConfig | null>(null);
  const value = useMemo(() => ({ config, setConfig }), [config]);
  return (
    <AdminPageConfigContext.Provider value={value}>{children}</AdminPageConfigContext.Provider>
  );
}

export function useAdminPageConfig(): AdminPageConfig | null {
  return useContext(AdminPageConfigContext)?.config ?? null;
}

/**
 * Register the runtime admin page contract for the currently mounted page.
 * Clears on unmount.
 */
export function useRegisterAdminPageConfig(config: AdminPageConfig | null | undefined) {
  const ctx = useContext(AdminPageConfigContext);

  useEffect(() => {
    if (!ctx || !config) return;
    ctx.setConfig(config);
    return () => {
      ctx.setConfig(null);
    };
  }, [ctx, config]);
}

/** Stable helper for pages that import a shared config object. */
export function useAdminPageConfigRegistration(config: AdminPageConfig) {
  useRegisterAdminPageConfig(config);
}
