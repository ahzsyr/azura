import { Suspense } from "react";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import { isRegistrationEnabled } from "@/features/setup/setup.service";
import { AccountLoginForm } from "@/components/account/account-login-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountLoginPage({ params }: Props) {
  const { locale } = await params;
  const registrationEnabled = await isRegistrationEnabled();
  return (
    <div className="container-premium py-16">
      <Suspense fallback={<RouteSuspenseFallback variant="list" />}>
        <AccountLoginForm locale={locale} registrationEnabled={registrationEnabled} />
      </Suspense>
    </div>
  );
}
