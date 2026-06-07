export type StatusServicePublic = {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  status: string;
  uptimePercent: number;
};

export type StatusIncidentPublic = {
  id: string;
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  status: string;
  startedAt: string;
  resolvedAt: string | null;
};

export type StatusMaintenancePublic = {
  id: string;
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  startsAt: string;
  endsAt: string;
};

export type StatusBoardPublic = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  services: StatusServicePublic[];
  incidents: StatusIncidentPublic[];
  maintenance: StatusMaintenancePublic[];
};

export type StatusBoardAdmin = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  sortOrder: number;
  isPublished: boolean;
  serviceCount: number;
  incidentCount: number;
  maintenanceCount: number;
};

export type StatusBoardBlockInput = {
  statusBoardSlug?: string;
};
