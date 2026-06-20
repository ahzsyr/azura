import { auth } from "@/lib/auth";
import { AccountDashboard } from "@/components/account/account-dashboard";
import { AccountHub } from "@/components/account/account-hub";
import { isRegistrationEnabled } from "@/features/setup/setup.service";
import { CmsPageBlocksSection } from "@/features/cms/components/cms-page-blocks-section";
import type { Locale } from "@/i18n/routing";
import type { Session } from "next-auth";

/** Session-aware route: auth() reads cookies — must not use ISR (see locale layout comment). */
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  // #region agent log
  console.error("[debug-0d3e6c] account page render start", { locale, dynamic: "force-dynamic", hasDynamicExport: true });
  void fetch("http://127.0.0.1:7249/ingest/39015276-3520-45ed-aa0e-f49ed49423a8", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0d3e6c" }, body: JSON.stringify({ sessionId: "0d3e6c", runId: "post-fix", hypothesisId: "H1", location: "account/page.tsx:entry", message: "account page render start", data: { locale, dynamic: "force-dynamic", hasDynamicExport: true }, timestamp: Date.now() }) }).catch(() => {});
  // #endregion
  let session: Session | null = null;
  try {
    // #region agent log
    void fetch("http://127.0.0.1:7249/ingest/39015276-3520-45ed-aa0e-f49ed49423a8", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0d3e6c" }, body: JSON.stringify({ sessionId: "0d3e6c", runId: "post-fix", hypothesisId: "H1", location: "account/page.tsx:before-auth", message: "calling auth()", data: { locale }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
    session = await auth();
    // #region agent log
    void fetch("http://127.0.0.1:7249/ingest/39015276-3520-45ed-aa0e-f49ed49423a8", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0d3e6c" }, body: JSON.stringify({ sessionId: "0d3e6c", runId: "post-fix", hypothesisId: "H1", location: "account/page.tsx:after-auth", message: "auth() resolved", data: { locale, hasSession: Boolean(session), role: session?.user?.role ?? null }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
  } catch (error) {
    const err = error instanceof Error ? { name: error.name, message: error.message, digest: (error as Error & { digest?: string }).digest } : { value: String(error) };
    // #region agent log
    void fetch("http://127.0.0.1:7249/ingest/39015276-3520-45ed-aa0e-f49ed49423a8", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0d3e6c" }, body: JSON.stringify({ sessionId: "0d3e6c", runId: "pre-fix", hypothesisId: "H1,H2", location: "account/page.tsx:auth-error", message: "auth() threw", data: { locale, err }, timestamp: Date.now() }) }).catch(() => {});
    console.error("[debug-0d3e6c] auth() threw", { locale, err });
    // #endregion
    throw error;
  }
  const cmsBlocks = <CmsPageBlocksSection slug="account" locale={locale as Locale} />;

  if (session?.user?.role === "CUSTOMER") {
    const user = session.user;
    return (
      <>
        {cmsBlocks}
        <AccountDashboard
          locale={locale}
          userName={user.name ?? "Account"}
          userEmail={user.email ?? ""}
        />
      </>
    );
  }

  const registrationEnabled = await isRegistrationEnabled();
  return (
    <>
      {cmsBlocks}
      <AccountHub
        locale={locale}
        registrationEnabled={registrationEnabled}
        isAdminSession={session?.user?.role === "ADMIN"}
      />
    </>
  );
}
