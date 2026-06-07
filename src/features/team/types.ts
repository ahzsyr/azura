export type TeamDepartmentPublic = {
  id: string;
  nameEn: string;
  nameAr: string;
};

export type TeamMemberPublic = {
  id: string;
  departmentId: string | null;
  nameEn: string;
  nameAr: string;
  roleEn: string;
  roleAr: string;
  bioEn: string;
  bioAr: string;
  email: string;
  phone: string;
  locationEn: string;
  locationAr: string;
  skills: string[];
  imageUrl: string;
};

export type TeamDirectoryPublic = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  departments: TeamDepartmentPublic[];
  members: TeamMemberPublic[];
};

export type TeamDirectoryAdmin = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
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
