import "server-only";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCronSecret } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";
import { isAdminRole, isCustomerRole } from "@/features/auth/portal";
import { adminLifecycleDestination } from "@/features/auth/admin-lifecycle";

export type ApiAccess = "public" | "admin" | "customer" | "cron" | "super_admin";

export type ApiSession = {
  user: {
    id: string;
    role: string;
    email?: string | null;
    name?: string | null;
    sessionVersion?: number;
  };
};

type RouteContext = { params?: Promise<Record<string, string | string[]>> };

type HandlerArgs = {
  request: NextRequest;
  context: RouteContext;
  session: ApiSession | null;
};

type DefineApiRouteConfig = {
  access: ApiAccess;
  /** Re-read User.sessionVersion from DB (sensitive admin mutations). */
  verifySessionVersion?: boolean;
  /** Skip admin password/MFA lifecycle gate (account/MFA/password routes). */
  skipAdminLifecycleGate?: boolean;
  cronEnvKeys?: string[];
  cronHeaderName?: string;
  handler: (args: HandlerArgs) => Promise<Response> | Response;
};

export async function assertRole(
  role: UserRole | "ADMIN" | "CUSTOMER" | "SUPER_ADMIN",
): Promise<{ session: ApiSession } | { error: NextResponse }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const userRole = session.user.role;
  const ok =
    userRole === role ||
    (role === "ADMIN" && isAdminRole(userRole)) ||
    (role === "CUSTOMER" && isCustomerRole(userRole));
  if (!ok) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return {
    session: {
      user: {
        id: session.user.id,
        role: session.user.role,
        email: session.user.email,
        name: session.user.name,
        sessionVersion: (session.user as { sessionVersion?: number }).sessionVersion,
      },
    },
  };
}

async function verifyDbSessionVersion(session: ApiSession): Promise<NextResponse | null> {
  try {
    const row = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { sessionVersion: true, role: true },
    });
    if (!row) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tokenVersion = session.user.sessionVersion ?? 0;
    const dbVersion = row.sessionVersion ?? 0;
    if (tokenVersion !== dbVersion) {
      return NextResponse.json({ error: "Session revoked" }, { status: 401 });
    }
    if (row.role !== session.user.role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null;
  } catch {
    // sessionVersion column may be missing until migrate — skip check
    return null;
  }
}

async function assertAdminLifecycleClear(session: ApiSession): Promise<NextResponse | null> {
  try {
    const row = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { mustChangePassword: true, totpEnabled: true, disabledAt: true },
    });
    if (!row) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (row.disabledAt) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const block = adminLifecycleDestination(row);
    if (!block) return null;
    return NextResponse.json(
      { error: "Lifecycle incomplete", code: block.kind },
      { status: 403 },
    );
  } catch {
    return null;
  }
}

/**
 * Required wrapper for API route handlers.
 * New routes are denied unless `access: "public"` is set intentionally.
 */
export function defineApiRoute(config: DefineApiRouteConfig) {
  return async function routeHandler(
    request: NextRequest,
    context: RouteContext = {},
  ): Promise<Response> {
    let session: ApiSession | null = null;

    if (config.access === "cron") {
      if (
        !verifyCronSecret(request, {
          envKeys: config.cronEnvKeys ?? ["CRON_SECRET"],
          headerName: config.cronHeaderName,
        })
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (config.access === "admin" || config.access === "super_admin") {
      const result =
        config.access === "super_admin"
          ? await assertRole("SUPER_ADMIN")
          : await assertRole("ADMIN");
      if ("error" in result) return result.error;
      session = result.session;
      if (config.verifySessionVersion !== false) {
        const revoked = await verifyDbSessionVersion(session);
        if (revoked) return revoked;
      }
      if (!config.skipAdminLifecycleGate) {
        const blocked = await assertAdminLifecycleClear(session);
        if (blocked) return blocked;
      }
    } else if (config.access === "customer") {
      const result = await assertRole("CUSTOMER");
      if ("error" in result) return result.error;
      session = result.session;
      if (config.verifySessionVersion !== false) {
        const revoked = await verifyDbSessionVersion(session);
        if (revoked) return revoked;
      }
    } else if (config.access === "public") {
      // optional session for public routes
      const raw = await auth();
      if (raw?.user?.id) {
        session = {
          user: {
            id: raw.user.id,
            role: raw.user.role,
            email: raw.user.email,
            name: raw.user.name,
            sessionVersion: (raw.user as { sessionVersion?: number }).sessionVersion,
          },
        };
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return config.handler({ request, context, session });
  };
}
