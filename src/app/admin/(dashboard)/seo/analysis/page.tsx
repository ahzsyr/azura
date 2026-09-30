import { getSeoDashboardVm } from "@/features/seo/operator/dashboard.service";
import { SeoOperatorDashboard } from "@/features/seo/operator/components/seo-operator-dashboard";

/** Soft destination for /admin/seo/analysis — Dashboard in place. */
export default async function AdminSeoAnalysisAliasPage() {
  const vm = await getSeoDashboardVm();
  return <SeoOperatorDashboard vm={vm} />;
}
