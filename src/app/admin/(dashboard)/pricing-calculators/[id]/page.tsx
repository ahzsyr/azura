import { notFound } from "next/navigation";
import { loadAdminDisplayTitle } from "@/features/portal/lib/load-admin-edit-context";
import { pricingCalculatorService } from "@/features/pricing-calculators/service";
import { PricingCalculatorEditPage } from "@/features/pricing-calculators/admin/pricing-calculator-edit-page";

type Props = { params: Promise<{ id: string }> };

export default async function AdminPricingCalculatorEditRoute({ params }: Props) {
  const { id } = await params;
  const calculator = await pricingCalculatorService.getByIdForAdmin(id);
  if (!calculator) notFound();
  const displayTitle = await loadAdminDisplayTitle("PricingCalculator", id, "title", calculator.slug);
  return <PricingCalculatorEditPage calculator={calculator} displayTitle={displayTitle} />;
}
