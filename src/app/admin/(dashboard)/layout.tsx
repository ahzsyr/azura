import "@/styles/routes/admin.css";
import "@/styles/site-preloader.css";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { AdminThemeStyles } from "@/components/admin/layout/admin-theme-styles";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import { buildResolvedTheme } from "@/lib/theme/theme-resolver.server";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decideJwtRefresh } from "@/lib/session-revocation";
import { isAdminRole, resolveLoginEntryPath } from "@/features/auth/portal";
import {
  adminLifecycleBlocksDashboard,
  adminLifecycleDestination,
  isAdminClientRefresh,
  shouldRedirectForAdminLifecycle,
} from "@/features/auth/admin-lifecycle";
import { listInactiveContributedNavItemIds } from "@/platform/packages/contributions";
import { findNavGroupIdByPath } from "@/config/admin-nav";
import { isAdminPathGranted, parseAdminSectionGrants } from "@/features/auth/admin-section-grants";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const headerList = await headers();
  const pathname = headerList.get("x-admin-pathname") ?? "";

  // Edge middleware cannot see the database. The Node JWT callback marks the
  // token revoked (drops id/role), and this check covers the FIRST request
  // after revoke so protected UI never renders: no user, wrong role, disabled
  // row, or a token whose frozen sessionVersion no longer matches the DB.
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    redirect(resolveLoginEntryPath({ locale: "en", callbackUrl: pathname || "/admin" }));
  }

  let row: {
    role: string;
    sessionVersion: number;
    mustChangePassword: boolean;
    totpEnabled: boolean;
    disabledAt: Date | null;
    adminSectionGrants?: unknown;
  } | null = null;
  try {
    row = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        sessionVersion: true,
        mustChangePassword: true,
        totpEnabled: true,
        disabledAt: true,
        adminSectionGrants: true,
      },
    });
  } catch (error) {
    console.error(
      "[admin/dashboard] account check failed; redirecting to login",
      error instanceof Error ? error.name : "unknown",
    );
    redirect(resolveLoginEntryPath({ locale: "en", callbackUrl: pathname || "/admin" }));
  }

  if (!row || row.disabledAt) {
    redirect(resolveLoginEntryPath({ locale: "en", callbackUrl: pathname || "/admin" }));
  }
  const decision = decideJwtRefresh(
    (session.user as { sessionVersion?: number }).sessionVersion ?? 0,
    row as Parameters<typeof decideJwtRefresh>[1],
  );
  if (decision.action === "revoke") {
    redirect(resolveLoginEntryPath({ locale: "en", callbackUrl: pathname || "/admin" }));
  }

  // Password change always wins. The OTP flag on the JWT is only honored
  // while delivery is still unconfigured — a saved Email Account clears it.
  let adminOtpUnconfigured = false;
  if (session.user.adminOtpUnconfigured) {
    try {
      const { isAdminEmailMfaConfigured } = await import("@/features/auth/admin-auth-delivery");
      adminOtpUnconfigured = !(await isAdminEmailMfaConfigured());
    } catch {
      adminOtpUnconfigured = true;
    }
  }
  const lifecycleBlock = adminLifecycleDestination({ ...row, adminOtpUnconfigured });
  const clientRefresh = isAdminClientRefresh(headerList);
  const dashboardLocked = adminLifecycleBlocksDashboard(lifecycleBlock);
  // A save re-renders this layout. Redirecting here drops the open page and section.
  if (
    lifecycleBlock &&
    shouldRedirectForAdminLifecycle({
      block: lifecycleBlock,
      pathname,
      clientRefresh,
    })
  ) {
    redirect(lifecycleBlock.redirectTo);
  }

  if (pathname && !clientRefresh && !dashboardLocked) {
    const grants = row.role === "SUPER_ADMIN" ? null : parseAdminSectionGrants(row.adminSectionGrants);
    if (
      !isAdminPathGranted({
        pathname,
        role: row.role,
        grants,
        groupId: findNavGroupIdByPath(pathname),
      })
    ) {
      redirect("/admin");
    }
  }

  let resolved;
  try {
    resolved = await resolvePublishedSiteTheme();
  } catch (themeErr) {
    const themeMsg = themeErr instanceof Error ? themeErr.message : String(themeErr);
    console.error("[admin/dashboard] resolvePublishedSiteTheme failed, using defaults:", themeMsg);
    resolved = await buildResolvedTheme(getDefaultThemeTokens());
  }

  let inactiveNavItemIds: string[] = [];
  try {
    inactiveNavItemIds = await listInactiveContributedNavItemIds();
  } catch (error) {
    console.error("[admin/dashboard] package nav skipped", error);
  }

  return (
    <div className="admin-route-root">
      <AdminThemeStyles resolved={resolved} />
      <AdminShell
        inactiveNavItemIds={inactiveNavItemIds}
        allowedSectionIds={
          row.role === "SUPER_ADMIN" ? null : parseAdminSectionGrants(row.adminSectionGrants)
        }
        otpSetupPending={lifecycleBlock?.kind === "otp_delivery_unconfigured"}
      >{children}</AdminShell>
    </div>
  );
}
