import { Suspense } from "react";
import { AccountResetPasswordForm } from "@/components/account/account-reset-password-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;
  return (
    <div className="container-premium py-16">
      <Suspense fallback={<p className="text-muted-foreground text-center">Loading…</p>}>
        <AccountResetPasswordForm locale={locale} />
      </Suspense>
    </div>
  );
}
