import Image from "next/image";
import Link from "next/link";
import type { HeaderWorkspace } from "@/features/navigation/types";
import { buildHeaderRootPresentation } from "@/features/navigation/header-root-attributes";
import { resolveMenuForSurface } from "@/features/navigation/menu-engine";
import { getItemHref, localePath } from "@/features/navigation/resolve-href";
import { DEFAULT_BRAND_SHORT } from "@/config/site";
import type { HeaderThemeConfig } from "@/types/theme";

type Props = {
  workspace: HeaderWorkspace;
  locale: string;
  themePreset?: string;
  headerConfig?: HeaderThemeConfig;
};

/** SSR header placeholder — logo and top-level nav until deferred client header hydrates. */
export function SiteHeaderShell({
  workspace,
  locale,
  themePreset,
  headerConfig,
}: Props) {
  const { branding } = workspace;
  const logoUrl =
    branding.logoImageLightUrl || branding.logoImageUrl || branding.logoImageDarkUrl || "";
  const hasImage = branding.logoMode === "image" && logoUrl;
  const brandName = (branding.brandName ?? "").trim() || DEFAULT_BRAND_SHORT;
  const homeHref = localePath("/", locale);
  const sticky = headerConfig?.sticky !== false;
  const navItems =
    headerConfig?.showNav !== false ? resolveMenuForSurface(workspace, "desktop") : [];

  const root = buildHeaderRootPresentation({
    workspace,
    surface: "site",
    themePreset,
    sticky,
    shellPlaceholder: true,
  });

  return (
    <div
      className={root.className}
      style={root.style}
      {...Object.fromEntries(
        Object.entries(root.dataAttributes).filter(([, value]) => value !== undefined),
      )}
    >
      <div className="site-header">
        <div className="nav-container">
          <Link href={homeHref} className="logo-area" aria-label={`${brandName} — Home`}>
            <div className="brand-logo">
              {hasImage ? (
                <Image
                  src={logoUrl}
                  alt=""
                  width={120}
                  height={40}
                  priority
                  sizes="120px"
                  className="site-header-shell__logo"
                />
              ) : (
                brandName
              )}
            </div>
          </Link>
          {navItems.length > 0 ? (
            <nav className="site-header-shell__nav" aria-label="Main">
              <ul className="site-header-shell__nav-list">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <Link href={getItemHref(item, locale)} className="site-header-shell__nav-link">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : headerConfig?.showNav !== false ? (
            <div className="site-header-shell__nav-placeholder" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
