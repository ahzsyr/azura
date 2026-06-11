import { auth } from "@/lib/auth";
import { AccountDashboard } from "@/components/account/account-dashboard";
import { AccountHub } from "@/components/account/account-hub";
import { isRegistrationEnabled } from "@/features/setup/setup.service";
import { CmsPageBlocksSection } from "@/features/cms/components/cms-page-blocks-section";
import type { Locale } from "@/i18n/routing";

export const revalidate = 60;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();
  const cmsBlocks = <CmsPageBlocksSection slug="account" locale={locale as Locale} />;

  if (session?.user?.role === "CUSTOMER") {
    const user = session.user;
    return (
      <>
        {cmsBlocks}
        <AccountDashboard
          locale={locale}
          userName={user.name ?? "Account"}
          userEmail={user.email ?? ""}
        />
      </>
    );
  }

  const registrationEnabled = await isRegistrationEnabled();
  return (
    <>
      {cmsBlocks}
      <AccountHub
        locale={locale}
        registrationEnabled={registrationEnabled}
        isAdminSession={session?.user?.role === "ADMIN"}
      />
    </>
  );
}
