import type { LocalizedValueMap } from "@/features/translation/types";

export type TeamDepartmentPublic = {
  id: string;
  name: LocalizedValueMap;
};

export type TeamMemberPublic = {
  id: string;
  departmentId: string | null;
  name: LocalizedValueMap;
  role: LocalizedValueMap;
  bio: LocalizedValueMap;
  email: string;
  phone: string;
  location: LocalizedValueMap;
  skills: string[];
  imageUrl: string;
};

export type TeamDirectoryPublic = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  description: LocalizedValueMap;
  departments: TeamDepartmentPublic[];
  members: TeamMemberPublic[];
};

export type TeamDirectoryAdmin = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  description: LocalizedValueMap;
  sortOrder: number;
  isPublished: boolean;
  departmentCount: number;
  memberCount: number;
};

export type TeamDirectoryBlockInput = {
  teamDirectorySlug?: string;
  departmentId?: string;
  limit?: number;
};
