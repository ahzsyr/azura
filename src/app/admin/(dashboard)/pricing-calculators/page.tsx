import { pricingCalculatorService } from "@/features/pricing-calculators/service";
import { PricingCalculatorManager } from "@/features/pricing-calculators/admin/pricing-calculator-manager";

export default async function AdminPricingCalculatorsPage() {
  let calculators: Awaited<ReturnType<typeof pricingCalculatorService.listForAdmin>> = [];
  try {
    calculators = await pricingCalculatorService.listForAdmin();
  } catch {
    // DB unavailable
  }
  return <PricingCalculatorManager calculators={calculators} />;
}
