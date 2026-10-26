import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseAdminSectionGrants } from "@/features/auth/admin-section-grants";
import { MFA_METHOD_LABELS, resolveMfaState } from "@/features/auth/mfa-policy.helpers";
import { buildUserFunnel, type FunnelEvent } from "@/features/account/admin/user-funnel";
import type {
  LoginLogRow,
  PortalRole,
  PortalUserRecord,
  PortalUserRow,
  UsageLogRow,
  UserActivity,
} from "@/features/account/admin/user-portal-types";

export type {
  LoginLogRow,
  PortalRole,
  PortalUserRecord,
  PortalUserRow,
  UsageLogRow,
  UserActivity,
} from "@/features/account/admin/user-portal-types";

const USAGE_PAGE_SIZE = 25;

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function asRole(role: string): PortalRole {
  if (role === "ADMIN" || role === "SUPER_ADMIN" || role === "CUSTOMER") return role;
  return "CUSTOMER";
}

async function lastLoginByUser(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  try {
    const grouped = await prisma.securityAuditLog.groupBy({
      by: ["actorId"],
      where: { action: "auth.login.success", actorId: { in: ids } },
      _max: { createdAt: true },
    });
    for (const row of grouped) {
      if (row.actorId && row._max.createdAt) map.set(row.actorId, row._max.createdAt.toISOString());
    }
  } catch (error) {
    console.warn("[user-portal] login lookup failed", error instanceof Error ? error.name : "unknown");
  }
  return map;
}

function toRow(
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    disabledAt: Date | null;
    lockedUntil: Date | null;
    mustChangePassword: boolean;
    createdAt: Date;
  },
  lastLoginAt: string | null,
): PortalUserRow {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: asRole(user.role),
    disabledAt: iso(user.disabledAt),
    lockedUntil: iso(user.lockedUntil),
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt,
  };
}

const listSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  disabledAt: true,
  lockedUntil: true,
  mustChangePassword: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export async function listPortalUsers(role: "all" | "admin" | "customer"): Promise<PortalUserRow[]> {
  const where: Prisma.UserWhereInput =
    role === "customer"
      ? { role: "CUSTOMER" }
      : role === "admin"
        ? { role: { in: ["ADMIN", "SUPER_ADMIN"] } }
        : {};
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: listSelect,
  });
  const logins = await lastLoginByUser(users.map((user) => user.id));
  return users.map((user) => toRow(user, logins.get(user.id) ?? null));
}

export async function listRecentPortalUsers(take = 8): Promise<PortalUserRow[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: listSelect,
  });
  const logins = await lastLoginByUser(users.map((user) => user.id));
  return users.map((user) => toRow(user, logins.get(user.id) ?? null));
}

export async function getPortalUser(id: string): Promise<PortalUserRecord | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...listSelect,
      dateOfBirth: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      marketingOptIn: true,
      totpEnabled: true,
      totpSecret: true,
      mfaMethod: true,
      mfaDisabledByAdminAt: true,
      adminSectionGrants: true,
    },
  });
  if (!user) return null;
  const logins = await lastLoginByUser([user.id]);
  const mfa = resolveMfaState(user);
  return {
    ...toRow(user, logins.get(user.id) ?? null),
    dateOfBirth: iso(user.dateOfBirth),
    addressLine1: user.addressLine1,
    addressLine2: user.addressLine2,
    city: user.city,
    state: user.state,
    postalCode: user.postalCode,
    country: user.country,
    marketingOptIn: user.marketingOptIn,
    totpEnabled: mfa.enrolled && mfa.method === "AUTHENTICATOR",
    mfaEnrolled: mfa.enrolled,
    mfaMethod: mfa.method,
    mfaMethodLabel: mfa.method ? MFA_METHOD_LABELS[mfa.method] : null,
    mfaDisabledByAdminAt: iso(user.mfaDisabledByAdminAt),
    adminSectionGrants: parseAdminSectionGrants(user.adminSectionGrants),
  };
}

function metaDetail(meta: unknown): string | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const record = meta as Record<string, unknown>;
  const reason = record.reason ?? record.channel ?? record.subject;
  return typeof reason === "string" && reason.trim() ? reason.trim() : null;
}

export async function getUserActivity(userId: string, usagePage = 0): Promise<UserActivity> {
  const empty: UserActivity = {
    funnel: buildUserFunnel({ firstSeenAt: null, events: [] }),
    loginLog: [],
    usage: [],
    usageHasMore: false,
  };
  const page = Number.isFinite(usagePage) && usagePage > 0 ? Math.floor(usagePage) : 0;

  let loginLog: LoginLogRow[] = [];
  try {
    const logs = await prisma.securityAuditLog.findMany({
      where: {
        actorId: userId,
        OR: [{ action: { startsWith: "auth." } }, { action: { startsWith: "mfa." } }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, action: true, ip: true, createdAt: true, meta: true },
    });
    loginLog = logs.map((log) => ({
      id: log.id,
      action: log.action,
      ip: log.ip,
      createdAt: log.createdAt.toISOString(),
      detail: metaDetail(log.meta),
    }));
  } catch (error) {
    console.warn("[user-portal] login log failed", error instanceof Error ? error.name : "unknown");
  }

  try {
    const links = await prisma.userVisitorLink.findMany({
      where: { userId },
      select: { visitorId: true, visitor: { select: { firstSeenAt: true } } },
    });
    const visitorIds = links.map((link) => link.visitorId);
    const firstSeen = links.reduce<Date | null>((min, link) => {
      const at = link.visitor.firstSeenAt;
      if (!min || at < min) return at;
      return min;
    }, null);

    let funnelEvents: FunnelEvent[] = [];
    let usage: UsageLogRow[] = [];
    let usageHasMore = false;
    if (visitorIds.length > 0) {
      const [oldest, newest] = await Promise.all([
        prisma.marketingEvent.findMany({
          where: { visitorId: { in: visitorIds } },
          orderBy: { clientOccurredAt: "asc" },
          take: 400,
          select: { name: true, landingPagePath: true, clientOccurredAt: true },
        }),
        prisma.marketingEvent.findMany({
          where: { visitorId: { in: visitorIds } },
          orderBy: { clientOccurredAt: "desc" },
          skip: page * USAGE_PAGE_SIZE,
          take: USAGE_PAGE_SIZE + 1,
          select: {
            id: true,
            name: true,
            landingPagePath: true,
            clientOccurredAt: true,
            session: { select: { deviceType: true, browser: true } },
          },
        }),
      ]);
      funnelEvents = oldest.map((event) => ({
        name: event.name,
        path: event.landingPagePath,
        at: event.clientOccurredAt.toISOString(),
      }));
      usageHasMore = newest.length > USAGE_PAGE_SIZE;
      usage = newest.slice(0, USAGE_PAGE_SIZE).map((event) => ({
        id: event.id,
        name: event.name,
        path: event.landingPagePath,
        at: event.clientOccurredAt.toISOString(),
        device: [event.session?.deviceType, event.session?.browser].filter(Boolean).join(" · ") || null,
      }));
    }

    return {
      funnel: buildUserFunnel({ firstSeenAt: iso(firstSeen), events: funnelEvents }),
      loginLog,
      usage,
      usageHasMore,
    };
  } catch (error) {
    console.warn("[user-portal] usage lookup failed", error instanceof Error ? error.name : "unknown");
    return { ...empty, loginLog };
  }
}
