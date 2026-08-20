import { Suspense } from "react";
import { marketingService } from "@/modules/marketing/service";
import { MarketingPlatformsPanel } from "@/modules/marketing/admin/platforms-panel";
import {
  listPublicProviderAppConfigs,
  type PublicMarketingProviderAppConfig,
} from "@/modules/marketing/providers/app-config";

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

  try {
    [platforms, appConfigs] = await Promise.all([
      marketingService.listPlatformOverview(),
      listPublicProviderAppConfigs(["meta", "linkedin"]),
    ]);
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
      />
    </Suspense>
  );
}
