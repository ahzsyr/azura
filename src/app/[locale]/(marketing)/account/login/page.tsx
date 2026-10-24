import { Suspense } from "react";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import { isRegistrationEnabled } from "@/features/setup/setup.service";
import { resolveCaptchaFor } from "@/features/captcha/captcha.service";
import { AccountLoginForm } from "@/components/account/account-login-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountLoginPage({ params }: Props) {
  const { locale } = await params;
  const [registrationEnabled, captcha] = await Promise.all([
    isRegistrationEnabled(),
    resolveCaptchaFor("login").catch(() => null),
  ]);
  return (
    <div className="container-premium py-16">
      <Suspense fallback={<RouteSuspenseFallback variant="list" />}>
        <AccountLoginForm
          locale={locale}
          registrationEnabled={registrationEnabled}
          captchaSiteKey={captcha?.widgetVisible ? captcha.siteKey : ""}
        />
      </Suspense>
    </div>
  );
}
