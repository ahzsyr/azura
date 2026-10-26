import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EmailAccountsAdminClient } from "@/features/email/admin/email-accounts-admin-client";
import { listEmailAccounts } from "@/features/email/email-accounts.service";
import { accountSettingsService } from "@/features/account/account-settings.service";
import { getAuthEmailDeliveryState } from "@/features/email/auth-email-sender";
import type { EmailDeliveryStatus } from "@/features/email/admin/email-delivery-settings-card";
import { isAdminRole } from "@/features/auth/portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmailAccountPublic } from "@/features/email/email-accounts.types";

export const metadata = {
  title: "Email Accounts",
};

type PageData =
  | {
      ok: true;
      accounts: EmailAccountPublic[];
      delivery: { selectedId: string; fromName: string };
      deliveryStatus: EmailDeliveryStatus;
    }
  | { ok: false; error: string };

/** Load everything the screen needs; failures are data, not thrown JSX. */
async function loadPageData(): Promise<PageData> {
  try {
    const [accounts, settings] = await Promise.all([
      listEmailAccounts(),
      accountSettingsService.get(),
    ]);
    const deliveryState = await getAuthEmailDeliveryState(settings);
    return {
      ok: true,
      accounts,
      delivery: {
        selectedId: settings.emailDelivery.emailAccountId ?? "",
        fromName: settings.emailDelivery.fromName ?? "",
      },
      deliveryStatus: {
        effectiveAccountId: deliveryState.account?.id ?? null,
        effectiveAccountName: deliveryState.account?.name ?? null,
        effectiveFrom: deliveryState.account?.from ?? null,
        reason: deliveryState.reason,
      },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export default async function EmailAccountsSettingsPage() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    redirect("/account/login");
  }

  // Any admin may manage the accounts and the authentication sender; the
  // sender is a site setting, not a privilege of the account that saved it.
  const isMasterAdmin = session.user.role === "SUPER_ADMIN";
  const data = await loadPageData();

  if (!data.ok) {
    console.error("[admin/settings/email-accounts] load failed:", data.error);
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Email accounts unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Could not load email accounts. Check the database connection and try again.
          {data.error ? (
            <p className="mt-2 font-mono text-xs text-destructive">{data.error}</p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <EmailAccountsAdminClient
      initialAccounts={data.accounts}
      canManage={isMasterAdmin}
      delivery={data.delivery}
      deliveryStatus={data.deliveryStatus}
    />
  );
}
