import { marketingService } from "@/modules/marketing/service";
import { MarketingLeadsPanel } from "@/modules/marketing/admin/leads-panel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminMarketingLeadsPage() {
  const [leads, attributions] = await Promise.all([
    marketingService.listLeadEvents(),
    prisma.marketingLeadAttribution
      .findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: { source: true, internalCampaign: true },
      })
      .catch(() => []),
  ]);
  return <MarketingLeadsPanel leads={leads} attributions={attributions} />;
}
