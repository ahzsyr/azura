import { pricingPlanSetService } from "@/features/pricing-plans/service";
import { PricingPlanSetManager } from "@/features/pricing-plans/admin/pricing-plan-set-manager";

export default async function AdminPricingPlansPage() {
  let sets: Awaited<ReturnType<typeof pricingPlanSetService.listForAdmin>> = [];
  try {
    sets = await pricingPlanSetService.listForAdmin();
  } catch {
    // DB unavailable
  }
  return <PricingPlanSetManager sets={sets} />;
}
