import { notFound } from "next/navigation";
import { loadAdminDisplayTitle } from "@/features/portal/lib/load-admin-edit-context";
import { teamDirectoryService } from "@/features/team/service";
import { TeamDirectoryEditPage } from "@/features/team/admin/team-directory-edit-page";

type Props = { params: Promise<{ id: string }> };

export default async function AdminTeamEditRoute({ params }: Props) {
  const { id } = await params;
  const directory = await teamDirectoryService.getByIdForAdmin(id);
  if (!directory) notFound();
  const displayTitle = await loadAdminDisplayTitle("TeamDirectory", id, "title", directory.slug);
  return <TeamDirectoryEditPage directory={directory} displayTitle={displayTitle} />;
}
