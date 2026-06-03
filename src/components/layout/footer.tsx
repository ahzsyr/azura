"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import type { FooterThemeConfig } from "@/types/theme";
import { getDefaultSiteIdentity } from "@/lib/site-identity";
import { DEFAULT_FOOTER_CONFIG } from "@/features/theme/theme-config";
import { getLocalizedField } from "@/lib/utils";
import { cn } from "@/lib/utils";

type FooterProps = {
  company?: {
    phone: string;
    email: string;
    addressEn: string;
    addressAr: string;
    socialLinks?: Record<string, string> | unknown;
  } | null;
  locale: string;
  footerConfig?: FooterThemeConfig;
};

export function Footer({
  company,
  locale,
  footerConfig = DEFAULT_FOOTER_CONFIG,
}: FooterProps) {
  const brandName = getDefaultSiteIdentity().brandName;
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const address = company ? getLocalizedField(company, "address", locale) : undefined;
  const taglineOverride = getLocalizedField(footerConfig, "tagline", locale);
  const tagline = taglineOverride || t("tagline");

  const links = [
    { href: "/about", label: nav("about") },
    { href: "/packages", label: nav("packages") },
    { href: "/visa", label: nav("visa") },
    { href: "/contact", label: nav("contact") },
  ];

  const social =
    company?.socialLinks && typeof company.socialLinks === "object"
      ? (company.socialLinks as Record<string, string>)
      : null;

  const gridClass =
    footerConfig.columns === 2
      ? "md:grid-cols-2"
      : footerConfig.columns === 4
        ? "md:grid-cols-4"
        : "md:grid-cols-3";

  return (
    <footer className="border-t border-border/60 bg-foreground text-background">
      <div className={cn("container-premium grid gap-10 py-16", gridClass)}>
        <div className={footerConfig.columns === 4 ? "md:col-span-2" : undefined}>
          <h3 className="font-heading text-xl font-semibold text-accent">{brandName}</h3>
          <p className="mt-3 text-sm leading-relaxed text-background/70">{tagline}</p>
        </div>

        {footerConfig.showQuickLinks && (
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-accent">
              {t("quickLinks")}
            </h4>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-background/70 transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {footerConfig.showContact && (
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-accent">
              {t("contact")}
            </h4>
            <ul className="space-y-3 text-sm text-background/70">
              {company?.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-accent" />
                  {company.phone}
                </li>
              )}
              {company?.email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-accent" />
                  {company.email}
                </li>
              )}
              {address && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  {address}
                </li>
              )}
            </ul>
          </div>
        )}

        {footerConfig.showSocial && social && Object.keys(social).length > 0 && (
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-accent">
              {t("followUs")}
            </h4>
            <ul className="space-y-2 text-sm">
              {Object.entries(social).map(([name, url]) =>
                url ? (
                  <li key={name}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-background/70 hover:text-accent capitalize"
                    >
                      {name}
                    </a>
                  </li>
                ) : null
              )}
            </ul>
          </div>
        )}
      </div>
      <div className="border-t border-background/10">
        <div className="container-premium py-6 text-center text-xs text-background/50">
          © {new Date().getFullYear()} {brandName}. {t("rights")}
        </div>
      </div>
    </footer>
  );
}
