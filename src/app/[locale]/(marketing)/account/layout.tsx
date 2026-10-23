import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decideJwtRefresh } from "@/lib/session-revocation";
import {
  isAdminRole,
  resolveLoginEntryPath,
  resolvePostLoginRedirect,
} from "@/features/auth/portal";
import { routing } from "@/i18n/routing";
import { AccountSessionProvider } from "@/components/account/account-session-provider";

/** Public auth surfaces that must render without a session. */
const PUBLIC_ACCOUNT_PATHS = new Set([
  "/account/login",
  "/account/register",
  "/account/forgot-password",
  "/account/reset-password",
  "/account/verify-email",
  "/account/accept-invite",
]);

function isPublicAccountPath(pathname: string): boolean {
  const stripped = pathname.replace(/^\/([a-z]{2})(?=\/)/i, "");
  return PUBLIC_ACCOUNT_PATHS.has(stripped);
}

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const pathname = headerList.get("x-account-pathname") ?? "";
  const locale = routing.defaultLocale;

  // Public auth pages render for everyone (middleware sends signed-in users on).
  if (pathname && isPublicAccountPath(pathname)) {
    return <AccountSessionProvider>{children}</AccountSessionProvider>;
  }

  // Edge middleware has no DB access, so this is the first place a revoked
  // session can be caught: no user, disabled row, or mismatched version.
  const session = await auth();
  if (!session?.user?.id) {
    redirect(resolveLoginEntryPath({ locale, callbackUrl: pathname || null }));
  }
  if (isAdminRole(session.user.role)) {
    redirect(resolvePostLoginRedirect({ role: session.user.role, locale, callbackUrl: null }));
  }

  let row: {
    role: string;
    sessionVersion: number;
    mustChangePassword: boolean;
    totpEnabled: boolean;
    email: string | null;
    disabledAt: Date | null;
  } | null = null;
  try {
    row = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        sessionVersion: true,
        mustChangePassword: true,
        totpEnabled: true,
        email: true,
        disabledAt: true,
      },
    });
  } catch (error) {
    console.error(
      "[account/layout] account check failed; redirecting to login",
      error instanceof Error ? error.name : "unknown",
    );
    redirect(resolveLoginEntryPath({ locale, callbackUrl: pathname || null }));
  }

  if (!row || row.disabledAt) {
    redirect(resolveLoginEntryPath({ locale, callbackUrl: pathname || null }));
  }
  const decision = decideJwtRefresh(
    (session.user as { sessionVersion?: number }).sessionVersion ?? 0,
    row as Parameters<typeof decideJwtRefresh>[1],
  );
  if (decision.action === "revoke") {
    redirect(resolveLoginEntryPath({ locale, callbackUrl: null }));
  }

  return <AccountSessionProvider>{children}</AccountSessionProvider>;
}
