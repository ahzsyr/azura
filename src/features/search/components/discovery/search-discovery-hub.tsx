"use client";

import { useEffect, useState } from "react";
import { Clock, Star, TrendingUp } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { SearchLocale } from "@/features/search/components/search-ui/search-copy";
import { searchCopy } from "@/features/search/components/search-ui/search-copy";
import { getRecentSearches } from "@/features/search/components/search-history.storage";
import { getRecentlyViewed } from "@/features/discovery-blocks/lib/recently-viewed.storage";
import { cn } from "@/lib/utils";

type Props = {
  locale: SearchLocale;
  onApplyQuery: (q: string) => void;
  className?: string;
};

export function SearchDiscoveryHub({ locale, onApplyQuery, className }: Props) {
  const t = searchCopy(locale);
  const [popular, setPopular] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<
    ReturnType<typeof getRecentlyViewed>
  >([]);

  useEffect(() => {
    setRecent(getRecentSearches(locale, 8));
    setRecentlyViewed(getRecentlyViewed(locale, 6));
    fetch(`/api/search/discovery?locale=${locale}`)
      .then((r) => r.json())
      .then((data) => {
        const ac = data.autocomplete ?? data.config?.autocomplete;
        setPopular(ac?.popularQueries?.slice(0, 8) ?? data.popularQueries?.slice(0, 8) ?? []);
        setTrending(data.trendingQueries?.slice(0, 8) ?? []);
      })
      .catch(() => {});
  }, [locale]);

  const hasContent =
    popular.length || trending.length || recent.length || recentlyViewed.length;
  if (!hasContent) return null;

  const QueryChip = ({
    q,
    icon: Icon,
  }: {
    q: string;
    icon: typeof Star;
  }) => (
    <button
      type="button"
      onClick={() => onApplyQuery(q)}
      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-sm font-medium hover:bg-muted/60"
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {q}
    </button>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {recentlyViewed.length ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {locale === "ar" ? "شوهد مؤخرًا" : "Recently viewed"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {recentlyViewed.map((item) => (
              <Link
                key={`${item.entityType}:${item.entityId}`}
                href={item.urlPath}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-sm font-medium hover:bg-muted/60"
              >
                <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {item.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {recent.length ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.recent}
          </h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((q) => (
              <QueryChip key={q} q={q} icon={Star} />
            ))}
          </div>
        </section>
      ) : null}
      {popular.length ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.popular}
          </h2>
          <div className="flex flex-wrap gap-2">
            {popular.map((q) => (
              <QueryChip key={q} q={q} icon={Star} />
            ))}
          </div>
        </section>
      ) : null}
      {trending.length ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.trending}
          </h2>
          <div className="flex flex-wrap gap-2">
            {trending.map((q) => (
              <QueryChip key={q} q={q} icon={TrendingUp} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
