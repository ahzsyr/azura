import { notFound } from "next/navigation";
import { loadAdminDisplayTitle } from "@/features/portal/lib/load-admin-edit-context";
import { pricingPlanSetService } from "@/presets/pricing/service";
import { PricingPlanSetEditPage } from "@/presets/pricing/admin/pricing-plan-set-edit-page";

type Props = { params: Promise<{ id: string }> };

export default async function AdminPricingPlanSetEditRoute({ params }: Props) {
  const { id } = await params;
  const planSet = await pricingPlanSetService.getByIdForAdmin(id);
  if (!planSet) notFound();
  const displayTitle = await loadAdminDisplayTitle("PricingPlanSet", id, "title", planSet.slug);
  return <PricingPlanSetEditPage planSet={planSet} displayTitle={displayTitle} />;
}
