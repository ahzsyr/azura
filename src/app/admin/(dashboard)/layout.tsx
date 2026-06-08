import "@/styles/routes/admin.css";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { AdminThemeStyles } from "@/components/admin/layout/admin-theme-styles";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const resolved = await resolvePublishedSiteTheme();

  return (
    <div className="admin-route-root">
      <AdminThemeStyles resolved={resolved} />
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
