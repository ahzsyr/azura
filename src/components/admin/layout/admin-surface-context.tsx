"use client";

import { createContext, useContext } from "react";

const AdminSurfaceContext = createContext(false);

export function AdminSurfaceProvider({ children }: { children: React.ReactNode }) {
  return <AdminSurfaceContext.Provider value={true}>{children}</AdminSurfaceContext.Provider>;
}

export function useIsAdminSurface(): boolean {
  return useContext(AdminSurfaceContext);
}
