import { AccountForgotPasswordForm } from "@/components/account/account-forgot-password-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  return (
    <div className="container-premium py-16">
      <AccountForgotPasswordForm locale={locale} />
    </div>
  );
}
