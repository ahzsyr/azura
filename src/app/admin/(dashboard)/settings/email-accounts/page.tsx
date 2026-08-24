import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EmailAccountsAdminClient } from "@/features/email/admin/email-accounts-admin-client";
import { listEmailAccounts } from "@/features/email/email-accounts.service";
import { isAdminRole } from "@/features/auth/portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Email Accounts",
};

export default async function EmailAccountsSettingsPage() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    redirect("/account/login");
  }

  const isMasterAdmin = session.user.role === "SUPER_ADMIN";

  try {
    const accounts = await listEmailAccounts();
    return (
      <EmailAccountsAdminClient
        initialAccounts={accounts}
        canManage={isMasterAdmin}
      />
    );
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
          {errMsg ? (
            <p className="mt-2 font-mono text-xs text-destructive">{errMsg}</p>
          ) : null}
        </CardContent>
      </Card>
    );
  }
}
