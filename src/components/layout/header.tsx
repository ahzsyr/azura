"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { SearchCommand } from "@/features/search/components/search-lazy";
import { cn } from "@/lib/utils";
import { getLocalizedField } from "@/lib/utils";
import Image from "next/image";
import type { HeaderThemeConfig } from "@/types/theme";
import { getDefaultSiteIdentity } from "@/lib/site-identity";
import { DEFAULT_HEADER_CONFIG } from "@/features/theme/theme-config";

const navItems = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/products", key: "products" },
  { href: "/collections", key: "collections" },
  { href: "/services", key: "services" },
  { href: "/packages", key: "packages" },
  { href: "/compare", key: "compare" },
  { href: "/favorites", key: "favorites" },
  { href: "/gallery", key: "gallery" },
  { href: "/testimonials", key: "testimonials" },
  { href: "/contact", key: "contact" },
] as const;

type HeaderProps = {
  logoUrl?: string | null;
  headerConfig?: HeaderThemeConfig;
};

export function Header({ logoUrl, headerConfig = DEFAULT_HEADER_CONFIG }: HeaderProps) {
  const brandName = getDefaultSiteIdentity().brandName;
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const ctaLabel =
    getLocalizedField(headerConfig, "ctaLabel", locale) || t("inquire");
  const ctaHref = headerConfig.ctaHref || "/contact";

  return (
    <header
      className={cn(
        "z-50 border-b border-border/60 bg-background/95 backdrop-blur-md",
        headerConfig.sticky && "sticky top-0"
      )}
    >
      <div className="container-premium flex h-16 items-center justify-between md:h-20">
        {headerConfig.showLogo ? (
          <Link href="/" className="flex items-center gap-3">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={brandName}
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
                priority
              />
            ) : (
              <span className="font-heading text-lg font-bold tracking-wide text-primary md:text-xl">
                {brandName}
              </span>
            )}
            <span className="hidden text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:block">
              {t("brandTagline")}
            </span>
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">{brandName}</span>
        )}

        {headerConfig.showNav && (
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
        )}

        <div className="hidden items-center gap-3 lg:flex">
          {headerConfig.showSearch && <SearchCommand />}
          <LocaleSwitcher />
          {headerConfig.showCta && (
            <Button asChild variant="gold" size="sm">
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && headerConfig.showNav && (
        <div className="border-t border-border/60 bg-background lg:hidden">
          <nav className="container-premium flex flex-col gap-1 py-4">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
              >
                {t(item.key)}
              </Link>
            ))}
            <div className="mt-4 flex items-center justify-between">
              <LocaleSwitcher />
              {headerConfig.showCta && (
                <Button asChild variant="gold" size="sm">
                  <Link href={ctaHref} onClick={() => setOpen(false)}>
                    {ctaLabel}
                  </Link>
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
