import { AccountForgotPasswordForm } from "@/components/account/account-forgot-password-form";
import { resolveCaptchaFor } from "@/features/captcha/captcha.service";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  // Resolved on the server so the widget and the API agree: if this is false,
  // the form must not demand a token either.
  const captcha = await resolveCaptchaFor("passwordReset").catch(() => null);
  return (
    <div className="container-premium py-16">
      <AccountForgotPasswordForm
        locale={locale}
        captchaSiteKey={captcha?.widgetVisible ? captcha.siteKey : ""}
      />
    </div>
  );
}
