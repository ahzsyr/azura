import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountNotificationsPage } from "@/components/account/account-notifications-page";
import {
  isAdminRole,
  isCustomerRole,
  resolveLoginEntryPath,
  resolvePostLoginRedirect,
} from "@/features/auth/portal";
import { accountPublicPath } from "@/features/account/account-public-path";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountNotificationsRoute({ params }: Props) {
  const { locale } = await params;
  const session = await auth();

  if (session?.user && isAdminRole(session.user.role)) {
    redirect(
      resolvePostLoginRedirect({
        role: session.user.role,
        locale,
        callbackUrl: null,
      }),
    );
  }

  if (!session?.user || !isCustomerRole(session.user.role)) {
    redirect(
      resolveLoginEntryPath({ locale, callbackUrl: accountPublicPath(locale, "notifications") }),
    );
  }

  return <AccountNotificationsPage locale={locale} />;
}
