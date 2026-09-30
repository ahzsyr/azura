import { redirect } from "next/navigation";
import {
  isAdminRole,
  resolveLoginEntryPath,
  resolvePostLoginRedirect,
} from "@/features/auth/portal";
import { routing } from "@/i18n/routing";

type AdminSession = {
  user: {
    role?: string | null;
    email?: string | null;
    id?: string;
  };
};

/**
 * Defense-in-depth for admin pages. Middleware already gates /admin/*;
 * destinations always come from portal helpers.
 */
export function redirectUnlessAdmin(
  session: { user?: { role?: string | null; email?: string | null; id?: string } | null } | null,
  callbackUrl: string,
): asserts session is AdminSession {
  const role = session?.user?.role;
  if (!session?.user) {
    redirect(
      resolveLoginEntryPath({
        locale: routing.defaultLocale,
        callbackUrl,
      }),
    );
  }
  if (!isAdminRole(role)) {
    redirect(
      resolvePostLoginRedirect({
        role,
        locale: routing.defaultLocale,
        callbackUrl: null,
      }),
    );
  }
}
