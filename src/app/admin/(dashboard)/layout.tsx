import "@/styles/routes/admin.css";
import "@/styles/site-preloader.css";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { AdminThemeStyles } from "@/components/admin/layout/admin-theme-styles";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import { buildResolvedTheme } from "@/lib/theme/theme-resolver.server";
import { getDefaultThemeTokens } from "@/features/theme/default-theme-tokens";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
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
