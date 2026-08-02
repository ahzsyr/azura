import { SeoWorkspaceOverview } from "@/features/seo/workspace/components/seo-workspace-overview";

type Props = {
  searchParams?: Promise<{ snapshotId?: string }>;
};

export default async function AdminSeoOverviewPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  return <SeoWorkspaceOverview snapshotId={params.snapshotId} />;
}
