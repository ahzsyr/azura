import { getEntityTypeDefinition } from "@/features/entities/preset-registry";

export const TEAM_MEMBER_PRESET_ID = "team-member" as const;

export function getTeamMemberPresetDefinition() {
  return getEntityTypeDefinition(TEAM_MEMBER_PRESET_ID);
}
