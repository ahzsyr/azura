import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminAccountForm } from "@/components/admin/admin-account-form";
import { redirectUnlessAdmin } from "@/features/auth/redirect-unless-admin";
import { getAdminAuthDeliveryStatus } from "@/features/auth/admin-auth-delivery";
import { getSelfMfaView } from "@/features/auth/mfa-self.read";

export const metadata = {
  title: "Admin account",
};

export default async function AdminAccountSettingsPage() {
  const session = await auth();
  redirectUnlessAdmin(session, "/admin/settings/account");
  const isMasterAdmin = session.user.role === "SUPER_ADMIN";
  // Email delivery is configured with the Email Accounts; this page only
  // reports whether email codes can be sent at all, for every admin.
  const [row, delivery, mfaStatus] = await Promise.all([
    session.user.id
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { email: true, pendingEmail: true },
        })
      : Promise.resolve(null),
    getAdminAuthDeliveryStatus().catch(() => ({
      mfaEnabled: false,
      hasEmailAccounts: false,
      otpEmailAccountId: null,
      reason: "no_accounts" as const,
    })),
    // This admin's own factor, read on the server for the MFA tab.
    session.user.id ? getSelfMfaView(session.user.id) : Promise.resolve(null),
  ]);

  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-muted-foreground">Loading admin account…</div>}
    >
      <AdminAccountForm
        currentEmail={row?.email ?? session.user.email ?? ""}
        pendingEmail={row?.pendingEmail ?? null}
        isMasterAdmin={isMasterAdmin}
        adminMfaEnabled={delivery.mfaEnabled}
        mfaStatus={mfaStatus}
      />
    </Suspense>
  );
}
