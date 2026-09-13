import { Suspense } from "react";
import { campaignService } from "@/modules/marketing/campaigns/service";
import { MarketingCampaignsPanel } from "@/modules/marketing/admin/campaigns-panel";

export const dynamic = "force-dynamic";

export default async function AdminMarketingCampaignsPage() {
  const campaigns = await campaignService.list().catch(() => []);
  const withPerf = await Promise.all(
    campaigns.map(async (c) => {
      const performance = await campaignService.getPerformance(c.id).catch(() => ({
        pageViews: 0,
        sessions: 0,
        leads: c._count.leadAttributions,
        qualifiedLeads: 0,
        google: { spend: 0, impressions: 0, clicks: 0, adsConversions: 0, ctr: 0, cpc: 0 },
        website: {
          sessions: 0,
          pageViews: 0,
          leads: c._count.leadAttributions,
          qualifiedLeads: 0,
          firstPartyConversions: 0,
        },
        joined: { cpl: 0, costPerQualifiedLead: 0 },
        googleBindingCount: (c.providerBindings ?? []).filter(
          (b: { providerId: string }) => b.providerId === "google-ads",
        ).length,
      }));
      return { ...c, performance };
    }),
  );

  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading campaigns…</div>}>
      <MarketingCampaignsPanel campaigns={withPerf} />
    </Suspense>
  );
}
