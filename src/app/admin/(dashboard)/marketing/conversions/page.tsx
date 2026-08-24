import { conversionService } from "@/modules/marketing/conversions/service";
import { MarketingConversionsPanel } from "@/modules/marketing/admin/conversions-panel";

export const dynamic = "force-dynamic";

export default async function AdminMarketingConversionsPage() {
  const [definitions, recent] = await Promise.all([
    conversionService.listDefinitions().catch(() => []),
    conversionService.listRecent(30).catch(() => []),
  ]);
  return <MarketingConversionsPanel definitions={definitions} recent={recent} />;
}
