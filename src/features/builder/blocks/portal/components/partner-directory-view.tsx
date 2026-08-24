"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import { pickLocale } from "@/features/builder/blocks/portal/lib/pick-locale";
import {
  portalAllLabel,
  portalPartnerMapSoonLabel,
  portalSearchPlaceholder,
  portalWebsiteLabel,
} from "@/features/builder/blocks/portal/lib/portal-ui-labels";
import type { PartnerProgramPublic } from "@/presets/partner/types";
import type { PartnerCardViewModel } from "@/view-models/partner-card";
import type { PartnerCategoryView } from "@/presets/partner/resolve-partners-for-block";
import { resolvePartnerCardFromSearchHit } from "@/presets/partner/resolve-partner-from-search-hit";
import { PartnerCardTemplate } from "@/templates/partner/partner-card-template";
import { DEFAULT_MEDIA_PLACEHOLDER } from "@/features/media/constants";

type Props = {
  locale: Locale;
  title?: string;
  subtitle?: string;
  layout?: "grid" | "list" | "map";
  showSearch?: boolean;
  showMap?: boolean;
  partnerProgramSlug?: string;
  categories?: PartnerCategoryView[];
  partnerViewModels?: PartnerCardViewModel[];
  /** Legacy fallback during migration. */
  program?: PartnerProgramPublic;
};

export function PartnerDirectoryView({
  locale,
  title,
  subtitle,
  layout = "grid",
  showSearch = true,
  showMap = false,
  partnerProgramSlug,
  categories = [],
  partnerViewModels,
  program,
}: Props) {
  const [query, setQuery] = useState("");
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<PartnerCardViewModel[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const useViewModels = partnerViewModels !== undefined;
  const useSearchApi = showSearch && !!partnerProgramSlug && useViewModels;

  useEffect(() => {
    if (!useSearchApi) {
      setSearchResults(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const facets: Record<string, string[]> = {};
        if (categorySlug) facets.categorySlug = [categorySlug];
        const params = new URLSearchParams({
          locale,
          kinds: "partner",
          scope: partnerProgramSlug,
          q: query.trim(),
          limit: "80",
        });
        if (Object.keys(facets).length) {
          params.set("facets", JSON.stringify(facets));
        }
        const res = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          results: Array<{
            entityId: string;
            facets?: Record<string, string | string[] | number | boolean>;
            card?: Record<string, unknown>;
          }>;
        };
        setSearchResults(
          data.results.map((hit) => resolvePartnerCardFromSearchHit(hit, partnerProgramSlug)),
        );
      } catch {
        if (!controller.signal.aborted) setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [useSearchApi, query, categorySlug, partnerProgramSlug, locale]);

  const legacyPartners = useMemo(() => {
    if (!program) return [];
    const q = query.trim().toLowerCase();
    return program.partners.filter((p) => {
      if (categorySlug && p.categorySlug !== categorySlug) return false;
      if (!q) return true;
      const name = pickLocale(p, "name", locale).toLowerCase();
      const loc = pickLocale(p, "location", locale).toLowerCase();
      return name.includes(q) || loc.includes(q);
    });
  }, [program, categorySlug, query, locale]);

  const categoryFilteredViewModels = useMemo(() => {
    if (!partnerViewModels) return [];
    if (!categorySlug) return partnerViewModels;
    return partnerViewModels.filter((vm) => vm.categorySlug === categorySlug);
  }, [partnerViewModels, categorySlug]);

  const displayViewModels = useSearchApi
    ? (searchResults ?? [])
    : categoryFilteredViewModels;

  const displayCategories = useViewModels
    ? categories
    : (program?.categories ?? []).map((cat) => ({
        id: cat.id,
        slug: cat.slug,
        name: pickLocale(cat, "name", locale),
      }));

  const partnerCount = useViewModels ? displayViewModels.length : legacyPartners.length;

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
      {displayCategories.length > 0 && (
        <div className="pb-partners__categories flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            className={cn(
              "text-xs px-3 py-1 rounded-full border",
              !categorySlug && "bg-primary text-primary-foreground border-primary",
            )}
            onClick={() => setCategorySlug(null)}
          >
            {portalAllLabel(locale)}
          </button>
          {displayCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={cn(
                "text-xs px-3 py-1 rounded-full border",
                categorySlug === cat.slug && "bg-primary text-primary-foreground border-primary",
              )}
              onClick={() => setCategorySlug(cat.slug)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
      <ul
        className={cn(
          "pb-partners__list",
          layout === "grid" && "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
          layout === "list" && "space-y-4",
        )}
      >
        {useViewModels
          ? displayViewModels.map((vm) => (
              <li key={vm.entityId}>
                <PartnerCardTemplate viewModel={vm} locale={locale} />
              </li>
            ))
          : legacyPartners.map((partner) => (
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
                  <p className="text-xs text-muted-foreground mt-2">
                    {pickLocale(partner, "location", locale)}
                  </p>
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
      {searchLoading && useSearchApi && (
        <p className="text-sm text-muted-foreground py-4 text-center">Searching…</p>
      )}
      {!searchLoading && partnerCount === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No partners found.</p>
      )}
    </div>
  );
}
