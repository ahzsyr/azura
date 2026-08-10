import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { MarketingProviderCredentialsForms } from "@/modules/marketing/admin/provider-credentials-forms";
import type { PublicMarketingProviderAppConfig } from "@/modules/marketing/providers/app-config";

type Platform = Awaited<
  ReturnType<typeof import("@/modules/marketing/service").marketingService.listPlatformOverview>
>[number];

export function MarketingPlatformsPanel({
  platforms,
  appConfigs,
  error,
  connected,
}: {
  platforms: Platform[];
  appConfigs: PublicMarketingProviderAppConfig[];
  error?: string;
  connected?: string;
}) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Social Platforms"
        description="Save provider app credentials in admin, then connect Meta and LinkedIn accounts. Secrets are encrypted at rest."
      />

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">
            Connection error: {error}
            {error.includes("missing_client")
              ? " — save Client ID / Secret below, then try Connect again."
              : null}
          </CardContent>
        </Card>
      ) : null}
      {connected ? (
        <Card>
          <CardContent className="pt-6 text-sm text-emerald-700">
            Connected provider: {connected}
          </CardContent>
        </Card>
      ) : null}

      <MarketingProviderCredentialsForms configs={appConfigs} />

      <div className="grid gap-4 md:grid-cols-2">
        {platforms.map((platform) => {
          const config = appConfigs.find((c) => c.providerId === platform.id);
          const ready =
            Boolean(config?.clientId) &&
            (platform.id === "meta"
              ? Boolean(config?.hasClientSecret || config?.hasAppSecret)
              : Boolean(config?.hasClientSecret));

          return (
            <Card key={platform.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{platform.displayName}</span>
                  <span className="text-xs font-normal text-muted-foreground uppercase">
                    {platform.connection?.status ?? "not connected"}
                  </span>
                </CardTitle>
                <CardDescription>
                  API {platform.version.apiVersion} · SDK {platform.version.sdkVersion}
                  {platform.compatibility.ok ? " · compatible" : " · upgrade required"}
                  {ready ? " · credentials saved" : " · credentials incomplete"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {platform.capabilities.map((cap) => (
                    <span
                      key={cap.capability}
                      className={`rounded-full border px-2 py-0.5 text-xs ${
                        cap.available
                          ? "border-emerald-300 text-emerald-700"
                          : "border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {cap.capability}
                      {!cap.available && cap.reason ? ` (${cap.reason})` : ""}
                    </span>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  Accounts: {platform.connection?.accountCount ?? 0}
                  {platform.runtime?.healthSummary
                    ? ` · ${platform.runtime.healthSummary}`
                    : ""}
                </div>
                {ready ? (
                  <Button asChild>
                    <Link href={`/api/marketing/oauth/${platform.id}/start`}>
                      {platform.connection ? "Reconnect" : "Connect"} {platform.displayName}
                    </Link>
                  </Button>
                ) : (
                  <Button type="button" disabled>
                    Save credentials first
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
