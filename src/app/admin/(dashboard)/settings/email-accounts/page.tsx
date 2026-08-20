import { EmailAccountsAdminClient } from "@/features/email/admin/email-accounts-admin-client";
import { listEmailAccounts } from "@/features/email/email-accounts.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Email Accounts",
};

export default async function EmailAccountsSettingsPage() {
  try {
    const accounts = await listEmailAccounts();
    return <EmailAccountsAdminClient initialAccounts={accounts} />;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[admin/settings/email-accounts] load failed:", errMsg);
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Email accounts unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Could not load email accounts. Check the database connection and try again.
        </CardContent>
      </Card>
    );
  }
}
