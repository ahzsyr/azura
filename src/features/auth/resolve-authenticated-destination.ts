"use server";

import { auth } from "@/lib/auth";
import {
  resolvePostLoginRedirect,
  resolvePortalLocale,
} from "@/features/auth/portal";
import { routing } from "@/i18n/routing";

/**
 * After signIn establishes a session, resolve the safe portal destination.
 * Uses auth() → session.user.role — never email or client-supplied role/portal.
 */
export async function resolveAuthenticatedDestination(input?: {
  callbackUrl?: string | null;
  locale?: string | null;
}): Promise<{ redirectTo: string } | { error: "unauthenticated" }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "unauthenticated" };
  }

  const locale =
    input?.locale?.trim() ||
    resolvePortalLocale({ pathname: null }) ||
    routing.defaultLocale;

  const redirectTo = resolvePostLoginRedirect({
    role: session.user.role,
    locale,
    callbackUrl: input?.callbackUrl,
  });

  return { redirectTo };
}
