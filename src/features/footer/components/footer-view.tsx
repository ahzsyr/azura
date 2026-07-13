import { getPathname } from "@/i18n/navigation";
import type { ResolvedFooter, FooterCompanyInfo } from "@/features/footer/types";
import type { SiteBrandConfig } from "@/types/site-identity";
import { getDefaultSiteIdentity } from "@/lib/site-identity";
import { getLocalizedField } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { getServerPlugin } from "@/features/footer/sections/registry.server";
import type { FooterRenderContext } from "@/features/footer/sections/types";

type Props = {
  resolved: ResolvedFooter;
  locale: string;
  brandConfig: SiteBrandConfig;
  rightsLabel: string;
  company?: FooterCompanyInfo | null;
  compact?: boolean;
};

function buildRenderContext(
  resolved: ResolvedFooter,
  locale: string,
  brandConfig: SiteBrandConfig,
  company: FooterCompanyInfo | null | undefined,
  compact?: boolean,
): FooterRenderContext {
  const address = company ? getLocalizedField(company, "address", locale) : undefined;
  const socialRaw =
    company?.socialLinks && typeof company.socialLinks === "object"
      ? (company.socialLinks as Record<string, string>)
      : null;
  const social: Record<string, string> = { ...(socialRaw ?? {}) };
  if (company?.email && !Object.values(social).some((u) => u?.includes("mailto:"))) {
    social.email = `mailto:${company.email}`;
  }
  if (!social.website && !social.Website) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (siteUrl) social.website = siteUrl;
  }

  const headingClass =
    resolved.design.headingStyle === "normal"
      ? "text-sm font-semibold text-accent"
      : "text-sm font-semibold uppercase tracking-wider text-accent";

  const linkClass =
    resolved.design.linkStyle === "underline"
      ? "text-sm text-background/70 underline-offset-2 hover:text-accent hover:underline"
      : resolved.design.linkStyle === "default"
        ? "text-sm text-background/90 hover:text-accent"
        : "text-sm text-background/70 transition-colors hover:text-accent";

  const brandName = brandConfig.brandName?.trim() || getDefaultSiteIdentity().brandName;
  const tagline = brandConfig.showTagline ? brandConfig.tagline?.trim() : "";

  return {
    locale,
    brandName,
    tagline,
    company,
    address,
    social,
    resolved,
    headingClass,
    linkClass,
    compact,
  };
}

function paddingClass(padding: ResolvedFooter["design"]["padding"]): string {
  if (padding === "small") return "py-8";
  if (padding === "large") return "py-16";
  return "py-12";
}

function containerClass(width: ResolvedFooter["design"]["containerWidth"]): string {
  if (width === "narrow") return "container-premium max-w-4xl";
  if (width === "full") return "w-full px-4 sm:px-6";
  return "container-premium";
}

/** Server-rendered footer markup — no client hooks. */
export function FooterView({
  resolved,
  locale,
  brandConfig,
  rightsLabel,
  company,
  compact,
}: Props) {
  const ctx = buildRenderContext(resolved, locale, brandConfig, company, compact);

  const gapClass =
    resolved.design.columnGap === "tight"
      ? "gap-6"
      : resolved.design.columnGap === "loose"
        ? "gap-14"
        : "gap-10";

  const tabletClass =
    resolved.responsive.tablet === 1
      ? "sm:grid-cols-1"
      : resolved.responsive.tablet === 3
        ? "sm:grid-cols-2 md:grid-cols-3"
        : "sm:grid-cols-2";
  const desktopClass =
    resolved.responsive.desktop === 2
      ? "lg:grid-cols-2"
      : resolved.responsive.desktop === 4
        ? "lg:grid-cols-4"
        : "lg:grid-cols-3";
  const gridClass = cn("grid-cols-1", tabletClass, desktopClass);

  const footerBg =
    resolved.design.background === "dark"
      ? "bg-foreground text-background"
      : resolved.design.background === "accent"
        ? "bg-accent text-accent-foreground"
        : resolved.design.background === "light"
          ? "bg-background text-foreground"
          : "bg-foreground text-background";

  const alignmentClass =
    resolved.design.alignment === "center"
      ? "text-center"
      : resolved.design.alignment === "end"
        ? "text-end"
        : "text-start";

  return (
    <footer
      className={cn(
        "site-footer",
        footerBg,
        resolved.design.divider === "none" && "border-t-0",
        resolved.design.divider === "top" && "border-t border-border/60",
        resolved.design.divider === "full" && "border border-border/60",
        resolved.design.borderStyle === "accent" && "border-t-2 border-accent",
      )}
    >
      <div
        className={cn(
          "grid",
          containerClass(resolved.design.containerWidth),
          paddingClass(resolved.design.padding),
          gapClass,
          alignmentClass,
          resolved.layout === "centered" ? "max-w-3xl mx-auto text-center" : gridClass,
          compact && "py-8 text-sm",
        )}
      >
        {resolved.columns.map((col) => {
          const plugin = getServerPlugin(col.type);
          if (!plugin) return null;
          const Renderer = plugin.Renderer;
          // Responsive visibility classes
          // hiddenOnMobile  → hidden below sm  (< 640 px)
          // hiddenOnTablet  → hidden sm–lg      (640–1024 px)
          const visClass = cn(
            col.hiddenOnMobile && col.hiddenOnTablet
              ? "hidden lg:block"
              : col.hiddenOnMobile
                ? "hidden sm:block"
                : col.hiddenOnTablet
                  ? "sm:hidden lg:block"
                  : undefined,
          );
          return (
            <div
              key={col.id}
              className={visClass || undefined}
              style={col.columnSlot != null ? { gridColumn: col.columnSlot } : undefined}
            >
              <Renderer column={col} ctx={ctx} />
            </div>
          );
        })}
      </div>
      {resolved.copyright.showBar ? (
        <div className="border-t border-background/10">
          <div
            className={cn(
              containerClass(resolved.design.containerWidth),
              "py-6 text-center text-xs text-background/50",
              compact && "py-4",
            )}
          >
            © {new Date().getFullYear()} {ctx.brandName}.{" "}
            {resolved.copyright.rightsText || rightsLabel}
            {resolved.copyright.suffix ? ` ${resolved.copyright.suffix}` : ""}
            {resolved.copyright.legalLinks.length > 0 ? (
              <span className="mt-2 block sm:mt-0 sm:ml-2 sm:inline">
                {resolved.copyright.legalLinks.map((link, i) => (
                  <span key={`${link.href}-${link.label}`}>
                    {i > 0 ? <span className="mx-2">·</span> : null}
                    {link.openInNewTab ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                        {link.label}
                      </a>
                    ) : (
                      <a
                        href={getPathname({ locale, href: link.href })}
                        className="hover:text-accent"
                      >
                        {link.label}
                      </a>
                    )}
                  </span>
                ))}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </footer>
  );
}
