import Image from "next/image";
import Link from "next/link";
import type { HeaderWorkspace } from "@/features/navigation/types";
import { localePath } from "@/features/navigation/resolve-href";
import { DEFAULT_BRAND_SHORT } from "@/config/site";
import type { HeaderThemeConfig } from "@/types/theme";

type Props = {
  workspace: HeaderWorkspace;
  locale: string;
  themePreset?: string;
  headerConfig?: HeaderThemeConfig;
};

/** SSR header placeholder — preserves layout dimensions until deferred client header hydrates. */
export function SiteHeaderShell({
  workspace,
  locale,
  themePreset,
  headerConfig,
}: Props) {
  const { settings, branding } = workspace;
  const logoUrl =
    branding.logoImageLightUrl || branding.logoImageUrl || branding.logoImageDarkUrl || "";
  const hasImage = branding.logoMode === "image" && logoUrl;
  const brandName = (branding.brandName ?? "").trim() || DEFAULT_BRAND_SHORT;
  const homeHref = localePath("/", locale);
  const sticky = headerConfig?.sticky !== false;
  const desktopMode = sticky ? (settings.headerDesktopMode ?? "sticky") : "static";

  return (
    <div
      className={`header-root header-style-${settings.headerStyle} site-header-shell`}
      data-header-shell="true"
      data-header-style={settings.headerStyle}
      data-header-surface="site"
      data-header-desktop={desktopMode}
      data-theme-preset={themePreset ?? undefined}
      aria-hidden="true"
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
          {headerConfig?.showNav !== false ? (
            <div className="site-header-shell__nav-placeholder" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
