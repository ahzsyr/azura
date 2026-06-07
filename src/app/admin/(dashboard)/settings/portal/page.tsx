import { Suspense } from "react";
import { isRegistrationEnabled, readSystemSettings } from "@/features/setup/setup.service";
import { accountSettingsService } from "@/features/account/account-settings.service";
import { PortalSettingsForm } from "@/components/admin/portal-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Visitor portal",
};

export default async function AdminPortalSettingsPage() {
  // #region agent log
  const { debugIngest } = await import("@/lib/debug-ingest");
  debugIngest("admin/settings/portal/page.tsx:entry", "loading portal settings", {}, "H2");
  // #endregion
  try {
    const [settings, registrationEnabled, accountSettings] = await Promise.all([
      readSystemSettings(),
      isRegistrationEnabled(),
      accountSettingsService.get(),
    ]);
    // #region agent log
    debugIngest("admin/settings/portal/page.tsx:success", "portal settings loaded", {}, "H2");
    // #endregion
    return (
      <Suspense
        fallback={<div className="p-6 text-sm text-muted-foreground">Loading visitor portal settings…</div>}
      >
        <PortalSettingsForm
          registrationEnabled={settings.registrationEnabled ?? registrationEnabled}
          passwordReset={accountSettings.passwordReset}
        />
      </Suspense>
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[admin/settings/portal] load failed:", errMsg);
    // #region agent log
    debugIngest(
      "admin/settings/portal/page.tsx:error",
      "portal settings load failed",
      { error: errMsg.slice(0, 300) },
      "H1",
    );
    // #endregion
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Visitor portal settings unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Could not load portal settings. Check DATABASE_URL in your deployment settings, confirm
          Supabase is active, then try again.
        </CardContent>
      </Card>
    );
  }
}
