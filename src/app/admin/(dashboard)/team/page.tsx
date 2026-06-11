import { teamDirectoryService } from "@/features/team/service";
import { TeamDirectoryManager } from "@/features/team/admin/team-directory-manager";

export default async function AdminTeamPage() {
  let directories: Awaited<ReturnType<typeof teamDirectoryService.listForAdmin>> = [];
  try {
    directories = await teamDirectoryService.listForAdmin();
  } catch {
    // DB unavailable
  }
  return <TeamDirectoryManager directories={directories} />;
}
