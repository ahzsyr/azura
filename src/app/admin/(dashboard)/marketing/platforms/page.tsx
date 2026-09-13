import { Suspense } from "react";
import { marketingService } from "@/modules/marketing/service";
import { MarketingPlatformsPanel } from "@/modules/marketing/admin/platforms-panel";
import {
  listPublicProviderAppConfigs,
  type PublicMarketingProviderAppConfig,
} from "@/modules/marketing/providers/app-config";
import { getGoogleAdsOperationalContext } from "@/modules/marketing/providers/google-ads/health";
import { migrateMarketingAdsCredentialsIntoSeo } from "@/modules/marketing/providers/google-ads/migrate-seo-credentials";
import { prisma } from "@/lib/prisma";
import { GOOGLE_ADS_PROVIDER_ID } from "@/modules/marketing/providers/google-ads/manifest";

export const dynamic = "force-dynamic";

function emptyAppConfigs(): PublicMarketingProviderAppConfig[] {
  return [
    {
      providerId: "meta",
      clientId: "",
      hasClientSecret: false,
      hasAppSecret: false,
      hasWebhookVerifyToken: false,
      pixelId: "",
      hasCapiAccessToken: false,
    },
    {
      providerId: "linkedin",
      clientId: "",
      hasClientSecret: false,
      hasAppSecret: false,
      hasWebhookVerifyToken: false,
      pixelId: "",
      hasCapiAccessToken: false,
    },
    {
      providerId: "google-ads",
      clientId: "",
      hasClientSecret: false,
      hasAppSecret: false,
      hasWebhookVerifyToken: false,
      pixelId: "",
      hasCapiAccessToken: false,
      hasDeveloperToken: false,
      hasLoginCustomerId: false,
    },
  ];
}

export default async function AdminMarketingPlatformsPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; connected?: string; provider?: string }>;
}) {
  const params = (await searchParams) ?? {};
  let platforms: Awaited<ReturnType<typeof marketingService.listPlatformOverview>> = [];
  let appConfigs = emptyAppConfigs();
  let loadError: string | undefined;
  let googleAdsHealth: {
    ok: boolean;
    summary: string;
    readiness?: "operational" | "setup_incomplete" | "not_connected";
    oauthConnected?: boolean;
    operational?: boolean;
    selectedCustomerId?: string | null;
    legacySeoCustomerIdHint?: string | null;
    items: Array<{
      id: string;
      label: string;
      ok: boolean;
      message: string;
      href?: string;
      actionLabel?: string;
    }>;
  } | null = null;

  try {
    const migration = await migrateMarketingAdsCredentialsIntoSeo().catch(() => ({
      migrated: false,
      legacySeoCustomerIdHint: null as string | null,
    }));
    [platforms, appConfigs] = await Promise.all([
      marketingService.listPlatformOverview(),
      listPublicProviderAppConfigs(["meta", "linkedin", "google-ads"]),
    ]);
    const googleConn = platforms.find((p) => p.id === "google-ads")?.connection?.id;
    const selectedAccount = await prisma.marketingAccount
      .findFirst({
        where: {
          accountType: "google_ads_customer",
          connection: { providerId: GOOGLE_ADS_PROVIDER_ID },
        },
      })
      .catch(() => null);
    const legacyHint =
      !selectedAccount?.externalAccountId && migration.legacySeoCustomerIdHint
        ? migration.legacySeoCustomerIdHint
        : null;
    const ops = await getGoogleAdsOperationalContext(googleConn, {
      legacySeoCustomerIdHint: legacyHint,
    }).catch(() => null);
    if (ops) {
      googleAdsHealth = {
        ok: ops.ok,
        summary: ops.summary,
        readiness: ops.readiness,
        oauthConnected: ops.oauthConnected,
        operational: ops.operational,
        selectedCustomerId: ops.selectedCustomerId,
        legacySeoCustomerIdHint: ops.legacySeoCustomerIdHint,
        items: ops.healthChecks,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin/marketing/platforms] load failed:", message, error);
    loadError =
      message.includes("does not exist") || message.includes("Invalid `prisma.")
        ? "Marketing database tables are missing. Redeploy so migrations run, or apply database/postgres/17-marketing-integrations.sql on Supabase."
        : "Could not load platform data. Try again after redeploying.";
  }

  return (
    <Suspense>
      <MarketingPlatformsPanel
        platforms={platforms}
        appConfigs={appConfigs}
        error={params.error ?? loadError}
        connected={params.connected ? params.provider : undefined}
        googleAdsHealth={googleAdsHealth}
      />
    </Suspense>
  );
}
