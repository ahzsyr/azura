import { getPathname } from "@/i18n/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import type { ResolvedFooter } from "@/features/footer/types";
import type { SiteBrandConfig } from "@/types/site-identity";
import { getDefaultSiteIdentity } from "@/lib/site-identity";
import { getLocalizedField } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Props = {
  resolved: ResolvedFooter;
  locale: string;
  brandConfig: SiteBrandConfig;
  rightsLabel: string;
  company?: {
    phone: string;
    email: string;
    addressEn: string;
    addressAr: string;
    socialLinks?: Record<string, string> | unknown;
  } | null;
  compact?: boolean;
};

/** Server-rendered footer markup — no client hooks. */
export function FooterView({
  resolved,
  locale,
  brandConfig,
  rightsLabel,
  company,
  compact,
}: Props) {
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

  const gapClass =
    resolved.design.columnGap === "tight"
      ? "gap-6"
      : resolved.design.columnGap === "loose"
        ? "gap-14"
        : "gap-10";

  const gridClass =
    resolved.gridColumns === 2
      ? "sm:grid-cols-2"
      : resolved.gridColumns === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

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

  return (
    <footer
      className={cn(
        "site-footer border-t border-border/60 bg-foreground text-background",
        resolved.design.borderStyle === "none" && "border-t-0",
        resolved.design.borderStyle === "accent" && "border-t-2 border-accent",
      )}
    >
      <div
        className={cn(
          "container-premium grid py-12",
          gapClass,
          resolved.layout === "centered" ? "max-w-3xl mx-auto text-center" : gridClass,
          compact && "py-8 text-sm",
        )}
      >
        {resolved.columns.map((col) => {
          if (col.type === "brand") {
            return (
              <div key={col.id} className={resolved.layout === "centered" ? "" : "sm:col-span-1"}>
                <h3 className="font-heading text-xl font-semibold text-accent">{brandName}</h3>
                {tagline ? (
                  <p className="mt-3 text-sm leading-relaxed text-background/70">{tagline}</p>
                ) : null}
                {company?.email ? (
                  <p className="mt-2 text-sm text-background/70">
                    <a href={`mailto:${company.email}`} className="hover:text-accent">
                      {company.email}
                    </a>
                  </p>
                ) : null}
                {col.body ? <p className="mt-2 text-sm text-background/60">{col.body}</p> : null}
              </div>
            );
          }
          if (col.type === "contact") {
            return (
              <div key={col.id}>
                {col.title ? <h4 className={cn("mb-4", headingClass)}>{col.title}</h4> : null}
                <ul className="space-y-3 text-sm text-background/70">
                  {col.showPhone && company?.phone ? (
                    <li className="flex items-center gap-2 justify-start">
                      <Phone className="h-4 w-4 shrink-0 text-accent" />
                      {company.phone}
                    </li>
                  ) : null}
                  {col.showEmail && company?.email ? (
                    <li className="flex items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-accent" />
                      {company.email}
                    </li>
                  ) : null}
                  {col.showAddress && address ? (
                    <li className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {address}
                    </li>
                  ) : null}
                </ul>
              </div>
            );
          }
          if (col.type === "social" && social && Object.keys(social).length > 0) {
            return (
              <div key={col.id}>
                {col.title ? <h4 className={cn("mb-4", headingClass)}>{col.title}</h4> : null}
                <ul className="space-y-2 text-sm">
                  {Object.entries(social).map(([name, url]) =>
                    url ? (
                      <li key={name}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(linkClass, "capitalize")}
                        >
                          {name}
                        </a>
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            );
          }
          if ((col.type === "menu" || col.type === "legal") && col.links.length) {
            return (
              <div key={col.id}>
                {col.title ? <h4 className={cn("mb-4", headingClass)}>{col.title}</h4> : null}
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={`${link.href}-${link.label}`}>
                      {link.openInNewTab ? (
                        <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                          {link.label}
                        </a>
                      ) : (
                        <a
                          href={getPathname({ locale, href: link.href })}
                          className={linkClass}
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          if (col.type === "text" && col.body) {
            return (
              <div key={col.id}>
                {col.title ? <h4 className={cn("mb-4", headingClass)}>{col.title}</h4> : null}
                <p className="text-sm leading-relaxed text-background/70">{col.body}</p>
              </div>
            );
          }
          return null;
        })}
      </div>
      {resolved.copyright.showBar ? (
        <div className="border-t border-background/10">
          <div className={cn("container-premium py-6 text-center text-xs text-background/50", compact && "py-4")}>
            © {new Date().getFullYear()} {brandName}.{" "}
            {resolved.copyright.rightsText || rightsLabel}
            {resolved.copyright.suffix ? ` ${resolved.copyright.suffix}` : ""}
          </div>
        </div>
      ) : null}
    </footer>
  );
}
