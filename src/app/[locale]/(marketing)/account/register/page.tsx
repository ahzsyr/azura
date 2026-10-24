import { AccountRegisterForm } from "@/components/account/account-register-form";
import { resolveCaptchaFor } from "@/features/captcha/captcha.service";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountRegisterPage({ params }: Props) {
  const { locale } = await params;
  const captcha = await resolveCaptchaFor("register").catch(() => null);
  return (
    <div className="container-premium py-12 md:py-16">
      <AccountRegisterForm
        locale={locale}
        captchaSiteKey={captcha?.widgetVisible ? captcha.siteKey : ""}
      />
    </div>
  );
}
