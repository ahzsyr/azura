import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { getSetupStatus } from "@/features/setup/setup.service";
import {
  hasSetupCompleteCookie,
  SETUP_COMPLETE_COOKIE,
} from "@/features/setup/setup-cookie";
import { getAdminEmailHint } from "@/lib/admin-email-hint";

type Props = {
  searchParams: Promise<{ setup?: string; callbackUrl?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  let setupComplete = false;
  try {
    const setupStatus = await getSetupStatus();
    setupComplete = setupStatus.setupComplete;
  } catch {
    setupComplete = process.env.SETUP_COMPLETE?.trim().toLowerCase() === "true";
  }

  const cookieStore = await cookies();
  const hasCookie = hasSetupCompleteCookie(cookieStore.get(SETUP_COMPLETE_COOKIE)?.value);

  const callbackUrl = params.callbackUrl?.trim();
  const hasValidCallback =
    Boolean(callbackUrl) &&
    callbackUrl!.startsWith("/") &&
    !callbackUrl!.startsWith("//");

  if (setupComplete && !hasCookie && !hasValidCallback) {
    const qs = new URLSearchParams();
    if (params.setup === "done") qs.set("setup", "done");
    const query = qs.toString();
    const returnTo = query ? `/admin/login?${query}` : "/admin/login";
    redirect(`/api/setup/reconcile?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const adminHint = setupComplete ? await getAdminEmailHint() : { email: null, maskedEmail: null, dbReady: true };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <LoginForm
          adminEmailHint={adminHint.maskedEmail}
          dbReady={adminHint.dbReady}
        />
      </Suspense>
    </div>
  );
}
