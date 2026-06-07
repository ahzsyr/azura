import { Suspense } from "react";
import { getComingSoonEnvOverrideForAdmin, readSystemSettings } from "@/features/setup/setup.service";
import { SiteAccessSettingsForm } from "@/components/admin/site-access-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Site access",
};

export default async function AdminSiteAccessSettingsPage() {
  // #region agent log
  const { debugIngest } = await import("@/lib/debug-ingest");
  debugIngest("admin/settings/site/page.tsx:entry", "loading site settings", {}, "H2");
  // #endregion
  try {
    const settings = await readSystemSettings();
    const envOverride = getComingSoonEnvOverrideForAdmin();
    const comingSoonEnabled = envOverride ?? settings.comingSoonEnabled;
    // #region agent log
    debugIngest(
      "admin/settings/site/page.tsx:success",
      "site settings loaded",
      { comingSoonEnabled },
      "H2",
    );
    // #endregion
    return (
      <Suspense
        fallback={
          <div className="text-muted-foreground p-6 text-sm">Loading site access settings…</div>
        }
      >
        <SiteAccessSettingsForm
          comingSoonEnabled={comingSoonEnabled}
          envOverride={envOverride}
        />
      </Suspense>
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[admin/settings/site] load failed:", errMsg);
    // #region agent log
    debugIngest(
      "admin/settings/site/page.tsx:error",
      "site settings load failed",
      { error: errMsg.slice(0, 300) },
      "H1",
    );
    // #endregion
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Site access settings unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Could not load site settings. Check DATABASE_URL in your deployment settings, confirm
          Supabase is active, then try again.
        </CardContent>
      </Card>
    );
  }
}
