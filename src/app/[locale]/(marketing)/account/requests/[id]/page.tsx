import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AccountRequestDetailPage } from "@/components/account/account-request-detail-page";
import { RouteSuspenseFallback } from "@/components/layout/route-suspense-fallback";
import {
  isAdminRole,
  isCustomerRole,
  resolveLoginEntryPath,
  resolvePostLoginRedirect,
} from "@/features/auth/portal";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function AccountRequestDetailRoute({ params }: Props) {
  const { locale, id } = await params;
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
    redirect(
      resolveLoginEntryPath({
        locale,
        callbackUrl: `/${locale}/account/requests/${id}`,
      }),
    );
  }

  return (
    <Suspense fallback={<RouteSuspenseFallback variant="list" />}>
      <AccountRequestDetailPage locale={locale} requestId={id} />
    </Suspense>
  );
}
