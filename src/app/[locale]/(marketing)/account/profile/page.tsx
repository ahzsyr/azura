import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountProfileForm } from "@/components/account/account-profile-form";
import { isAdminRole, isCustomerRole, resolveLoginEntryPath, resolvePostLoginRedirect } from "@/features/auth/portal";
import { accountPublicPath } from "@/features/account/account-public-path";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountProfilePage({ params }: Props) {
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
    redirect(resolveLoginEntryPath({ locale, callbackUrl: accountPublicPath(locale, "profile") }));
  }

  return <AccountProfileForm locale={locale} />;
}
