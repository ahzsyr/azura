import "@/styles/routes/admin.css";
import "@/styles/site-preloader.css";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { AdminThemeStyles } from "@/components/admin/layout/admin-theme-styles";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import { agentLog, agentLogError } from "@/lib/debug/agent-log";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {

  try {
    const resolved = await resolvePublishedSiteTheme();
    const typography = resolved.tokens.typography;


    return (
      <div className="admin-route-root">
        <AdminThemeStyles resolved={resolved} />
        <AdminShell>{children}</AdminShell>
      </div>
    );
  } catch (error) {
    throw error;
  }
}
