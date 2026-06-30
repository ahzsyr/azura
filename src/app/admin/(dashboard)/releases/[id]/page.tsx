import { notFound } from "next/navigation";
import { loadAdminDisplayTitle } from "@/features/portal/lib/load-admin-edit-context";
import { releaseSetService } from "@/presets/release/service";
import { ReleaseSetEditPage } from "@/presets/release/admin/release-set-edit-page";

type Props = { params: Promise<{ id: string }> };

export default async function AdminReleaseSetEditRoute({ params }: Props) {
  const { id } = await params;
  const releaseSet = await releaseSetService.getByIdForAdmin(id);
  if (!releaseSet) notFound();
  const displayTitle = await loadAdminDisplayTitle("ReleaseSet", id, "title", releaseSet.slug);
  return <ReleaseSetEditPage releaseSet={releaseSet} displayTitle={displayTitle} />;
}
