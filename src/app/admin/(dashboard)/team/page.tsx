import { teamDirectoryService } from "@/presets/team-member/service";
import { TeamDirectoryManager } from "@/presets/team-member/admin/team-directory-manager";

export default async function AdminTeamPage() {
  let directories: Awaited<ReturnType<typeof teamDirectoryService.listForAdmin>> = [];
  try {
    directories = await teamDirectoryService.listForAdmin();
  } catch {
    // DB unavailable
  }
  return <TeamDirectoryManager directories={directories} />;
}
