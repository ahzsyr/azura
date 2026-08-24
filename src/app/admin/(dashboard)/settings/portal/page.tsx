import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isRegistrationEnabled, readSystemSettings } from "@/features/setup/setup.service";
import { accountSettingsService } from "@/features/account/account-settings.service";
import { listEmailAccounts } from "@/features/email/email-accounts.service";
import { PortalSettingsForm } from "@/components/admin/portal-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Visitor portal",
};

export default async function AdminPortalSettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    redirect("/admin/settings/account");
  }

  try {
    const [settings, registrationEnabled, accountSettings, accounts] = await Promise.all([
      readSystemSettings(),
      isRegistrationEnabled(),
      accountSettingsService.get(),
      listEmailAccounts().catch(() => []),
    ]);
    return (
      <Suspense
        fallback={<div className="p-6 text-sm text-muted-foreground">Loading visitor portal settings…</div>}
      >
        <PortalSettingsForm
          registrationEnabled={settings.registrationEnabled ?? registrationEnabled}
          passwordReset={accountSettings.passwordReset}
          emailVerification={accountSettings.emailVerification}
          emailAccounts={accounts.map((a) => ({ id: a.id, name: a.name, from: a.from }))}
        />
      </Suspense>
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[admin/settings/portal] load failed:", errMsg);
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
