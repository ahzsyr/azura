import { Suspense } from "react";
import { getComingSoonEnvOverrideForAdmin, readSystemSettings } from "@/features/setup/setup.service";
import { SiteAccessSettingsForm } from "@/components/admin/site-access-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Site access",
};

export default async function AdminSiteAccessSettingsPage() {
  try {
    const settings = await readSystemSettings();
    const envOverride = getComingSoonEnvOverrideForAdmin();
    const comingSoonEnabled = envOverride ?? settings.comingSoonEnabled;
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
