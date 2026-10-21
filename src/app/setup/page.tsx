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

  let setupStatus;
  try {
    setupStatus = await getSetupStatus();
  } catch (error) {
    console.error("[setup] getSetupStatus failed:", error);
    setupStatus = {
      setupComplete: false,
      registrationEnabled: true,
      comingSoonEnabled: false,
      comingSoonEnvOverride: null,
      completedAt: null,
      databaseReady: false,
      databaseError:
        error instanceof Error ? error.message : "Database status check failed",
      databaseKind: "unknown" as const,
    };
  }

  if (setupStatus.setupComplete) {
    let home = "/en";
    try {
      const defaultLocale = await localeService.getDefaultUrlPrefix();
      home = `/${defaultLocale}`;
    } catch (error) {
      console.error("[setup] locale lookup failed during redirect:", error);
    }
    try {
      const cookieStore = await cookies();
      if (!hasSetupCompleteCookie(cookieStore.get(SETUP_COMPLETE_COOKIE)?.value)) {
        cookieStore.set(
          SETUP_COMPLETE_COOKIE,
          getSetupCompleteCookieValue(),
          setupCompleteCookieOptions(),
        );
      }
    } catch (error) {
      console.error("[setup] could not set setup-complete cookie:", error);
    }
    let destination = home;
    try {
      const session = await auth();
      if (session?.user && isAdminRole(session.user.role)) {
        destination = "/admin";
      }
    } catch (error) {
      console.error("[setup] auth check failed during redirect:", error);
    }
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
