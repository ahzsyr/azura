import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdminRole } from "@/features/auth/portal";
import { getCaptchaSettingsPublic } from "@/features/captcha/captcha.service";
import { CaptchaSettingsAdminClient } from "@/features/captcha/admin/captcha-settings-admin-client";
import type { CaptchaSettingsPublic } from "@/features/captcha/captcha.schema";

export const metadata = {
  title: "Captcha",
};

type LoadResult =
  | { ok: true; settings: CaptchaSettingsPublic }
  | { ok: false; error: string };

async function loadCaptchaSettings(): Promise<LoadResult> {
  try {
    return { ok: true, settings: await getCaptchaSettingsPublic() };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[admin/settings/captcha] load failed:", errMsg);
    return { ok: false, error: errMsg };
  }
}

export default async function CaptchaSettingsPage() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    redirect("/account/login");
  }
  const canManage = session.user.role === "SUPER_ADMIN";

  // JSX is built after the try/catch: an async failure is caught above, but a
  // render error must reach an error boundary instead.
  const result = await loadCaptchaSettings();

  if (!result.ok) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Captcha settings unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Could not load captcha settings. Check the database connection and try again.
          {result.error ? (
            <p className="mt-2 font-mono text-xs text-destructive">{result.error}</p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return <CaptchaSettingsAdminClient initial={result.settings} canManage={canManage} />;
}
