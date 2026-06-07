import { notFound } from "next/navigation";
import { pricingCalculatorService } from "@/features/pricing-calculators/service";
import { PricingCalculatorEditPage } from "@/features/pricing-calculators/admin/pricing-calculator-edit-page";

type Props = { params: Promise<{ id: string }> };

export default async function AdminPricingCalculatorEditRoute({ params }: Props) {
  const { id } = await params;
  const calculator = await pricingCalculatorService.getByIdForAdmin(id);
  if (!calculator) notFound();
  return <PricingCalculatorEditPage calculator={calculator} />;
}
