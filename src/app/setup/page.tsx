import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SetupWizard } from "@/components/setup/setup-wizard";
import { localeService } from "@/features/i18n/locale.service";
import { getSetupStatus } from "@/features/setup/setup.service";
import {
  hasSetupCompleteCookie,
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
    const hasCookie = hasSetupCompleteCookie(cookieStore.get(SETUP_COMPLETE_COOKIE)?.value);
    if (!hasCookie) {
      redirect(`/api/setup/reconcile?returnTo=${encodeURIComponent(home)}`);
    }
    redirect(home);
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
