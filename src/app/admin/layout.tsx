import type { Metadata } from "next";
import { AdminSessionProvider } from "@/components/admin/admin-session-provider";
import { AdminEditingLocaleProvider } from "@/components/admin/admin-editing-locale-provider";
import { resolveSiteIdentityFromDb } from "@/lib/site-identity.server";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [resolved, identity] = await Promise.all([
      resolvePublishedSiteTheme(),
      resolveSiteIdentityFromDb(),
    ]);
    const iconUrl = resolved.tokens?.faviconUrl || resolved.tokens?.logoUrl;
    return {
      title: {
        default: identity.brandName,
        template: `%s | ${identity.brandName}`,
      },
      icons: iconUrl ? { icon: iconUrl } : undefined,
    };
  } catch {
    return {
      title: {
        default: "Admin",
        template: "%s | Admin",
      },
    };
  }
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSessionProvider>
      <AdminEditingLocaleProvider>{children}</AdminEditingLocaleProvider>
    </AdminSessionProvider>
  );
}
