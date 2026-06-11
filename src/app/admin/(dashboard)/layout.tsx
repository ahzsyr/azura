import "@/styles/routes/admin.css";
import "@/styles/site-preloader.css";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import { AdminThemeStyles } from "@/components/admin/layout/admin-theme-styles";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import { agentLog, agentLogError } from "@/lib/debug/agent-log";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // #region agent log
  agentLog({
    location: "admin/(dashboard)/layout.tsx:entry",
    message: "DashboardLayout render start",
    hypothesisId: "B",
  });
  // #endregion

  try {
    const resolved = await resolvePublishedSiteTheme();
    const typography = resolved.tokens.typography;

    // #region agent log
    agentLog({
      location: "admin/(dashboard)/layout.tsx:theme",
      message: "theme resolved",
      hypothesisId: "B",
      data: {
        bodyFontType: typeof typography.bodyFont,
        headingFontType: typeof typography.headingFont,
        primaryColorType: typeof resolved.tokens.primaryColor,
        bodyFontSample:
          typeof typography.bodyFont === "string" ? typography.bodyFont.slice(0, 40) : typography.bodyFont,
      },
    });
    // #endregion

    return (
      <div className="admin-route-root">
        <AdminThemeStyles resolved={resolved} />
        <AdminShell>{children}</AdminShell>
      </div>
    );
  } catch (error) {
    // #region agent log
    agentLogError("admin/(dashboard)/layout.tsx:render", error, "B");
    // #endregion
    throw error;
  }
}
