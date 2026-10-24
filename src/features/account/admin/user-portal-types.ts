import type { AdminSectionId } from "@/features/auth/admin-section-grants";
import type { FunnelStage } from "@/features/account/admin/user-funnel";

export type PortalRole = "ADMIN" | "CUSTOMER" | "SUPER_ADMIN";

export type PortalUserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: PortalRole;
  disabledAt: string | null;
  lockedUntil: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export type PortalUserRecord = PortalUserRow & {
  dateOfBirth: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  marketingOptIn: boolean;
  totpEnabled: boolean;
  adminSectionGrants: AdminSectionId[] | null;
};

export type LoginLogRow = {
  id: string;
  action: string;
  ip: string | null;
  createdAt: string;
  detail: string | null;
};

export type UsageLogRow = {
  id: string;
  name: string;
  path: string | null;
  at: string;
  device: string | null;
};

export type UserActivity = {
  funnel: FunnelStage[];
  loginLog: LoginLogRow[];
  usage: UsageLogRow[];
  usageHasMore: boolean;
};
