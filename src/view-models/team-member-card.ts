import type { TeamMemberCardTemplateId } from "@/view-models/types";

/** Flattened team member card — no raw Prisma rows. */
export type TeamMemberCardViewModel = {
  templateId: TeamMemberCardTemplateId;
  presetId: "team-member";
  entityId: string;
  teamDirectorySlug: string;
  departmentId: string | null;
  name: string;
  role: string;
  bio: string;
  email: string;
  phone: string;
  location: string;
  skills: string[];
  imageUrl: string;
  imageAlt: string;
};
