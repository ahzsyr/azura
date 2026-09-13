import { redirect } from "next/navigation";
import {
  resolveLoginEntryPath,
  resolvePortalLocale,
} from "@/features/auth/portal";
import { routing } from "@/i18n/routing";

type Props = {
  searchParams: Promise<{ setup?: string; callbackUrl?: string }>;
};

/**
 * Compatibility redirect only — not an authentication surface.
 * Destinations come from portal helpers.
 */
export default async function AdminLoginRedirectPage({ searchParams }: Props) {
  const params = await searchParams;
  const locale = resolvePortalLocale({
    pathname: null,
    locales: [...routing.locales],
  });
  let entry = resolveLoginEntryPath({
    locale,
    callbackUrl: params.callbackUrl,
  });
  if (params.setup === "done") {
    const sep = entry.includes("?") ? "&" : "?";
    entry = `${entry}${sep}setup=done`;
  }
  redirect(entry);
}
