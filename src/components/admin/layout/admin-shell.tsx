"use client";

import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAdminKeyboardShortcuts, useUnsavedChangesGuard } from "@/hooks/use-admin-form";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { AdminThemeProvider } from "./admin-theme-provider";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopBar } from "./admin-top-bar";
import { AdminContentArea } from "./admin-content-area";

function AdminShellInner({ children }: { children: React.ReactNode }) {
  useAdminKeyboardShortcuts();
  useUnsavedChangesGuard();
  const clearPageActions = useAdminUiStore((s) => s.clearPageActions);

  useEffect(() => {
    return () => clearPageActions();
  }, [clearPageActions]);

  return (
    <div className="admin-shell flex h-screen overflow-hidden bg-muted/30">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopBar />
        <AdminContentArea>{children}</AdminContentArea>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeProvider>
      <TooltipProvider delayDuration={200}>
        <AdminShellInner>{children}</AdminShellInner>
      </TooltipProvider>
    </AdminThemeProvider>
  );
}

export { AdminSettingsRibbon, AdminSettingsSection } from "./admin-settings-ribbon";
export { AdminSettingsLayout } from "./admin-settings-layout";
export type { SettingsRibbonTab } from "./admin-settings-ribbon";
export { AdminPageHeader, AdminCardGrid } from "./admin-content-area";
export { AdminFormProvider, useAdminForm, useAdminFormOptional } from "./admin-form-provider";
export { AdminBreadcrumbs } from "./admin-breadcrumbs";
export { AdminFloatingActions } from "./admin-floating-actions";
export { AdminCollapsibleSection } from "./admin-collapsible-section";
export {
  AdminPageTransition,
  AdminStaggerContainer,
  AdminStaggerItem,
  AdminSkeleton,
  AdminAccordionContent,
} from "./admin-motion";
