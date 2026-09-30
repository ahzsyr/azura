import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminAccountForm } from "@/components/admin/admin-account-form";
import { redirectUnlessAdmin } from "@/features/auth/redirect-unless-admin";
import { accountSettingsService } from "@/features/account/account-settings.service";
import { listEmailAccounts } from "@/features/email/email-accounts.service";
import { getAdminAuthDeliveryStatus } from "@/features/auth/admin-auth-delivery";

export const metadata = {
  title: "Admin account",
};

export default async function AdminAccountSettingsPage() {
  const session = await auth();
  redirectUnlessAdmin(session, "/admin/settings/account");
  const isMasterAdmin = session.user.role === "SUPER_ADMIN";
  const [row, accountSettings, accounts, delivery] = await Promise.all([
    session.user.id
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { email: true, pendingEmail: true },
        })
      : Promise.resolve(null),
    isMasterAdmin
      ? accountSettingsService.get()
      : Promise.resolve(null),
    isMasterAdmin ? listEmailAccounts().catch(() => []) : Promise.resolve([]),
    isMasterAdmin
      ? getAdminAuthDeliveryStatus()
      : Promise.resolve({
          mfaEnabled: false,
          hasEmailAccounts: false,
          otpEmailAccountId: null,
          passwordResetEmailAccountId: null,
        }),
  ]);

  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-muted-foreground">Loading admin account…</div>}
    >
      <AdminAccountForm
        currentEmail={row?.email ?? session.user.email ?? ""}
        pendingEmail={row?.pendingEmail ?? null}
        isMasterAdmin={isMasterAdmin}
        emailAccounts={accounts.map((a) => ({ id: a.id, name: a.name, from: a.from }))}
        adminAuth={accountSettings?.adminAuth}
        adminMfaEnabled={delivery.mfaEnabled}
        hasEmailAccounts={delivery.hasEmailAccounts}
      />
    </Suspense>
  );
}
