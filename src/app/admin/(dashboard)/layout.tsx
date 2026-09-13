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
import { isAdminRole } from "@/features/auth/portal";
import {
  adminLifecycleDestination,
  isAdminLifecycleExemptPath,
} from "@/features/auth/admin-lifecycle";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.id && isAdminRole(session.user.role)) {
    const headerList = await headers();
    const pathname = headerList.get("x-admin-pathname") ?? "";
    if (pathname && !isAdminLifecycleExemptPath(pathname)) {
      const row = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { mustChangePassword: true, totpEnabled: true, disabledAt: true },
      });
      if (row?.disabledAt) {
        redirect("/account/login");
      }
      const block = row ? adminLifecycleDestination(row) : null;
      if (block) {
        redirect(block.redirectTo);
      }
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

  return (
    <div className="admin-route-root">
      <AdminThemeStyles resolved={resolved} />
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
