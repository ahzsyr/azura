import type { LocalizedValueMap } from "@/features/translation/types";

export type StatusServicePublic = {
  id: string;
  name: LocalizedValueMap;
  description: LocalizedValueMap;
  status: string;
  uptimePercent: number;
};

export type StatusIncidentPublic = {
  id: string;
  title: LocalizedValueMap;
  message: LocalizedValueMap;
  status: string;
  startedAt: string;
  resolvedAt: string | null;
};

export type StatusMaintenancePublic = {
  id: string;
  title: LocalizedValueMap;
  message: LocalizedValueMap;
  startsAt: string;
  endsAt: string;
};

export type StatusBoardPublic = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  description: LocalizedValueMap;
  services: StatusServicePublic[];
  incidents: StatusIncidentPublic[];
  maintenance: StatusMaintenancePublic[];
};

export type StatusBoardAdmin = {
  id: string;
  slug: string;
  title: LocalizedValueMap;
  description: LocalizedValueMap;
  sortOrder: number;
  isPublished: boolean;
  serviceCount: number;
  incidentCount: number;
  maintenanceCount: number;
};

export type StatusBoardBlockInput = {
  statusBoardSlug?: string;
};
