import { SeoWorkspaceOverview } from "@/features/seo/workspace/components/seo-workspace-overview";

type Props = {
  searchParams?: Promise<{ snapshotId?: string }>;
};

/** Legacy /admin/seo/analysis — Overview in place (no redirect). */
export default async function AdminSeoAnalysisAliasPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  return <SeoWorkspaceOverview snapshotId={params.snapshotId} />;
}
