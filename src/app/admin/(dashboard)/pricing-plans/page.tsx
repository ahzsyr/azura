import { pricingPlanSetService } from "@/presets/pricing/service";
import { PricingPlanSetManager } from "@/presets/pricing/admin/pricing-plan-set-manager";

export default async function AdminPricingPlansPage() {
  let sets: Awaited<ReturnType<typeof pricingPlanSetService.listForAdmin>> = [];
  try {
    sets = await pricingPlanSetService.listForAdmin();
  } catch {
    // DB unavailable
  }
  return <PricingPlanSetManager sets={sets} />;
}
