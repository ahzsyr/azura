import { SeoWorkspaceOverview } from "@/features/seo/workspace/components/seo-workspace-overview";

type Props = {
  searchParams?: Promise<{ snapshotId?: string }>;
};

/**
 * Legacy /admin/seo/audit — Overview in place.
 * Do not use redirect(): soft-nav/prefetch of a redirect-only page can break App Router.
 */
export default async function AdminSeoAuditAliasPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  return <SeoWorkspaceOverview snapshotId={params.snapshotId} />;
}
