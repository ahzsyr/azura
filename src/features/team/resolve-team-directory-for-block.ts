import type { TeamDirectoryBlockInput, TeamDirectoryPublic } from "./types";
import { getTeamDirectoryBySlugCached } from "@/services/data-loaders";

export async function resolveTeamDirectoryForBlock(
  props: TeamDirectoryBlockInput
): Promise<TeamDirectoryPublic | null> {
  const slug = (props.teamDirectorySlug ?? "").trim();
  if (!slug) return null;
  return getTeamDirectoryBySlugCached(slug, props.departmentId, props.limit);
}
