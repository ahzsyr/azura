"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { pickLocale } from "@/features/portal-blocks/lib/pick-locale";
import {
  portalAllLabel,
  portalPartnerMapSoonLabel,
  portalSearchPlaceholder,
  portalWebsiteLabel,
} from "@/features/portal-blocks/lib/portal-ui-labels";
import type { PartnerProgramPublic } from "@/features/partners/types";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";

type Props = {
  locale: Locale;
  program: PartnerProgramPublic;
  title?: string;
  subtitle?: string;
  layout?: "grid" | "list" | "map";
  showSearch?: boolean;
  showMap?: boolean;
};

export function PartnerDirectoryView({
  locale,
  program,
  title,
  subtitle,
  layout = "grid",
  showSearch = true,
  showMap = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [categorySlug, setCategorySlug] = useState<string | null>(null);

  const partners = useMemo(() => {
    const q = query.trim().toLowerCase();
    return program.partners.filter((p) => {
      if (categorySlug && p.categorySlug !== categorySlug) return false;
      if (!q) return true;
      const name = pickLocale(p, "name", locale).toLowerCase();
      const loc = pickLocale(p, "location", locale).toLowerCase();
      return name.includes(q) || loc.includes(q);
    });
  }, [program.partners, categorySlug, query, locale]);

  return (
    <div className={cn("pb-partners", `pb-partners--${layout}`, showMap && "pb-partners--with-map")}>
      {title && <h2 className="pb-partners__title font-heading text-2xl font-bold">{title}</h2>}
      {subtitle && <p className="pb-partners__subtitle text-muted-foreground mb-4">{subtitle}</p>}
      {showSearch && (
        <Input
          className="pb-partners__search mb-4 max-w-md"
          placeholder={portalSearchPlaceholder("partners", locale)}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      {program.categories.length > 0 && (
        <div className="pb-partners__categories flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            className={cn(
              "text-xs px-3 py-1 rounded-full border",
              !categorySlug && "bg-primary text-primary-foreground border-primary"
            )}
            onClick={() => setCategorySlug(null)}
          >
            {portalAllLabel(locale)}
          </button>
          {program.categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={cn(
                "text-xs px-3 py-1 rounded-full border",
                categorySlug === cat.slug && "bg-primary text-primary-foreground border-primary"
              )}
              onClick={() => setCategorySlug(cat.slug)}
            >
              {pickLocale(cat, "name", locale)}
            </button>
          ))}
        </div>
      )}
      <ul
        className={cn(
          "pb-partners__list",
          layout === "grid" && "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
          layout === "list" && "space-y-4"
        )}
      >
        {partners.map((partner) => (
          <li key={partner.id} className="pb-partners__card rounded-xl border p-4">
            <div className="relative h-12 w-24 mb-3">
              <Image
                src={partner.logoUrl || DEFAULT_MEDIA_PLACEHOLDER}
                alt={pickLocale(partner, "name", locale)}
                fill
                className="object-contain object-start"
                sizes="96px"
              />
            </div>
            <h3 className="font-medium">{pickLocale(partner, "name", locale)}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {pickLocale(partner, "description", locale)}
            </p>
            {pickLocale(partner, "location", locale) && (
              <p className="text-xs text-muted-foreground mt-2">{pickLocale(partner, "location", locale)}</p>
            )}
            {partner.websiteUrl && (
              <a
                href={partner.websiteUrl}
                className="text-xs text-primary mt-2 inline-block"
                target="_blank"
                rel="noopener noreferrer"
              >
                {portalWebsiteLabel(locale)}
              </a>
            )}
          </li>
        ))}
      </ul>
      {showMap && layout === "map" && (
        <p className="text-sm text-muted-foreground mt-6 text-center">
          {portalPartnerMapSoonLabel(locale)}
        </p>
      )}
    </div>
  );
}
