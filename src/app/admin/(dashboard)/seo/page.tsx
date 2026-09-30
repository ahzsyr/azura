import { getSeoDashboardVm } from "@/features/seo/operator/dashboard.service";
import { SeoOperatorDashboard } from "@/features/seo/operator/components/seo-operator-dashboard";

export default async function AdminSeoOverviewPage() {
  const vm = await getSeoDashboardVm();
  return <SeoOperatorDashboard vm={vm} />;
}
