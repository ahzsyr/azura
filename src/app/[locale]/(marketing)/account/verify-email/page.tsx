import { Suspense } from "react";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import { AccountVerifyEmailForm } from "@/components/account/account-verify-email-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountVerifyEmailPage({ params }: Props) {
  const { locale } = await params;
  return (
    <div className="container-premium py-16">
      <Suspense fallback={<RouteSuspenseFallback variant="list" />}>
        <AccountVerifyEmailForm locale={locale} />
      </Suspense>
    </div>
  );
}
