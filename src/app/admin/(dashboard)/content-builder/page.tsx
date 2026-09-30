import { ContentBuilderOverviewPage } from "@/features/content/admin/content-builder-overview-page";
import { loadContentBuilderOverviewStats } from "@/features/content/admin/content-builder-overview-stats";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Content Builder",
};

export default async function AdminContentBuilderOverviewRoute() {
  const stats = await loadContentBuilderOverviewStats();
  return <ContentBuilderOverviewPage stats={stats} />;
}
