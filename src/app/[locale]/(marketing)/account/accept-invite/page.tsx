import { Suspense } from "react";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import { AccountAcceptInviteForm } from "@/components/account/account-accept-invite-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountAcceptInvitePage({ params }: Props) {
  const { locale } = await params;
  return (
    <div className="container-premium py-16">
      <Suspense fallback={<RouteSuspenseFallback variant="list" />}>
        <AccountAcceptInviteForm locale={locale} />
      </Suspense>
    </div>
  );
}
