import { notFound } from "next/navigation";
import { pricingPlanSetService } from "@/features/pricing-plans/service";
import { PricingPlanSetEditPage } from "@/features/pricing-plans/admin/pricing-plan-set-edit-page";

type Props = { params: Promise<{ id: string }> };

export default async function AdminPricingPlanSetEditRoute({ params }: Props) {
  const { id } = await params;
  const planSet = await pricingPlanSetService.getByIdForAdmin(id);
  if (!planSet) notFound();
  return <PricingPlanSetEditPage planSet={planSet} />;
}
