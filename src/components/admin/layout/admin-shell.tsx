"use client";

import { usePathname } from "next/navigation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAdminKeyboardShortcuts, useUnsavedChangesGuard } from "@/hooks/use-admin-form";
import { AdminThemeProvider } from "./admin-theme-provider";
import { AdminCapabilityInit } from "./admin-capability-init";
import { AdminSurfaceProvider } from "./admin-surface-context";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopBar } from "./admin-top-bar";
import { AdminContentArea } from "./admin-content-area";
import { AdminChromeFab } from "./admin-floating-actions";
import { AdminHelpPanel } from "@/features/help/components/admin-help-panel";
import { AdminPageConfigProvider } from "./admin-page-config-provider";
import { AdminActionToastHost } from "./admin-action-toast";

const OTP_SETUP_EXEMPT_PATHS = ["/admin/settings/account", "/admin/settings/email-accounts"];

function OtpSetupNotice() {
  const pathname = usePathname() ?? "";
  if (OTP_SETUP_EXEMPT_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return null;
  }
  return (
    <div
      role="status"
      className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-200"
    >
      Admin sign-in is password-only because no email account is set up for login codes.{" "}
      <a href="/admin/settings/account" className="font-medium underline underline-offset-2">
        Finish setup in account settings
      </a>
      .
    </div>
  );
}

function AdminShellInner({
  children,
  inactiveNavItemIds,
  allowedSectionIds,
  otpSetupPending,
}: {
  children: React.ReactNode;
  inactiveNavItemIds: readonly string[];
  allowedSectionIds: readonly string[] | null;
  otpSetupPending: boolean;
}) {
  useAdminKeyboardShortcuts();
  useUnsavedChangesGuard();

  return (
    <AdminPageConfigProvider>
      <div className="admin-shell az-scroll flex h-screen flex-col overflow-hidden">
        <AdminTopBar />
        {otpSetupPending ? <OtpSetupNotice /> : null}
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <AdminSidebar inactiveNavItemIds={inactiveNavItemIds} allowedSectionIds={allowedSectionIds} />
          <AdminContentArea>{children}</AdminContentArea>
        </div>
        <AdminChromeFab />
        <AdminHelpPanel />
        <AdminActionToastHost />
      </div>
    </AdminPageConfigProvider>
  );
}

export function AdminShell({
  children,
  inactiveNavItemIds = [],
  allowedSectionIds = null,
  otpSetupPending = false,
}: {
  children: React.ReactNode;
  inactiveNavItemIds?: readonly string[];
  allowedSectionIds?: readonly string[] | null;
  otpSetupPending?: boolean;
}) {
  return (
    <AdminThemeProvider>
      <AdminCapabilityInit />
      <AdminSurfaceProvider>
        <TooltipProvider delayDuration={200}>
          <AdminShellInner
            inactiveNavItemIds={inactiveNavItemIds}
            allowedSectionIds={allowedSectionIds}
            otpSetupPending={otpSetupPending}
          >
            {children}
          </AdminShellInner>
        </TooltipProvider>
      </AdminSurfaceProvider>
    </AdminThemeProvider>
  );
}

export { AdminSettingsRibbon, AdminSettingsSection } from "./admin-settings-ribbon";
export { AdminSettingsLayout } from "./admin-settings-layout";
export type { SettingsRibbonTab } from "./admin-settings-ribbon";
export { AdminPageHeader, AdminCardGrid } from "./admin-content-area";
export { AdminFormProvider, useAdminForm, useAdminFormOptional, AdminFormDirtySync } from "./admin-form-provider";
export { AdminBreadcrumbs } from "./admin-breadcrumbs";
export { AdminFloatingActions, AdminChromeFab } from "./admin-floating-actions";
export { AdminCollapsibleSection } from "./admin-collapsible-section";
export {
  AdminPageTransition,
  AdminStaggerContainer,
  AdminStaggerItem,
  AdminSkeleton,
  AdminAccordionContent,
} from "./admin-motion";
