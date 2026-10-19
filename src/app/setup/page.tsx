import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { HardRedirect } from "@/components/setup/hard-redirect";
import { SetupWizard } from "@/components/setup/setup-wizard";
import { isAdminRole } from "@/features/auth/portal";
import { auth } from "@/lib/auth";
import { localeService } from "@/features/i18n/locale.service";
import { getSetupStatus } from "@/features/setup/setup.service";
import {
  getSetupCompleteCookieValue,
  hasSetupCompleteCookie,
  setupCompleteCookieOptions,
  SETUP_COMPLETE_COOKIE,
} from "@/features/setup/setup-cookie";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function SetupPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token;
  const setupStatus = await getSetupStatus();

  if (setupStatus.setupComplete) {
    const defaultLocale = await localeService.getDefaultUrlPrefix();
    const home = `/${defaultLocale}`;
    const cookieStore = await cookies();
    if (!hasSetupCompleteCookie(cookieStore.get(SETUP_COMPLETE_COOKIE)?.value)) {
      cookieStore.set(
        SETUP_COMPLETE_COOKIE,
        getSetupCompleteCookieValue(),
        setupCompleteCookieOptions(),
      );
    }
    const session = await auth();
    const destination =
      session?.user && isAdminRole(session.user.role) ? "/admin" : home;
    const headerList = await headers();
    const isRouterFlight =
      headerList.has("next-url") ||
      headerList.has("next-router-state-tree") ||
      headerList.has("next-router-prefetch");
    if (isRouterFlight) {
      return <HardRedirect href={destination} />;
    }
    redirect(destination);
  }

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <SetupWizard
        setupToken={token}
        databaseReady={setupStatus.databaseReady}
        databaseError={setupStatus.databaseError}
        databaseKind={setupStatus.databaseKind}
        setupAlreadyComplete={setupStatus.setupComplete}
      />
    </div>
  );
}
