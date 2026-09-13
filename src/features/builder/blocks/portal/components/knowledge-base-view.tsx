"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";
import {
  portalAllLabel,
  portalNoArticlesLabel,
  portalSearchPlaceholder,
} from "@/features/builder/blocks/portal/lib/portal-ui-labels";
import type { KnowledgeBasePublic } from "@/presets/knowledge/types";
import type { KnowledgeArticleCardViewModel } from "@/view-models/knowledge-article-card";
import type { KnowledgeCategoryView } from "@/presets/knowledge/resolve-knowledge-articles-for-block";
import { KnowledgeArticleCardTemplate } from "@/templates/knowledge/knowledge-article-card-template";
import { pickLocale } from "@/features/builder/blocks/portal/lib/pick-locale";
import { Link } from "@/i18n/navigation";

type Props = {
  locale: Locale;
  title?: string;
  subtitle?: string;
  layout?: "grid" | "list" | "sidebar";
  showSearch?: boolean;
  showCategories?: boolean;
  showRatings?: boolean;
  basePath?: string;
  /** ViewModel path (Phase 5 preset). */
  knowledgeBaseSlug?: string;
  categories?: KnowledgeCategoryView[];
  articleViewModels?: KnowledgeArticleCardViewModel[];
  /** Legacy fallback during migration. */
  knowledgeBase?: KnowledgeBasePublic;
};

export function KnowledgeBaseView({
  locale,
  title,
  subtitle,
  layout = "grid",
  showSearch = true,
  showCategories = true,
  showRatings = true,
  basePath = "/help",
  knowledgeBaseSlug,
  categories = [],
  articleViewModels,
  knowledgeBase,
}: Props) {
  const [query, setQuery] = useState("");
  const [categorySlug, setCategorySlug] = useState<string | null>(null);

  const useViewModels = articleViewModels !== undefined && Boolean(knowledgeBaseSlug);

  const legacyArticles = useMemo(() => {
    if (!knowledgeBase) return [];
    const q = query.trim().toLowerCase();
    return knowledgeBase.articles.filter((a) => {
      if (categorySlug && a.categorySlug !== categorySlug) return false;
      if (!q) return true;
      const titleText = pickLocale(a, "title", locale).toLowerCase();
      const excerpt = pickLocale(a, "excerpt", locale).toLowerCase();
      return titleText.includes(q) || excerpt.includes(q);
    });
  }, [knowledgeBase, categorySlug, query, locale]);

  const filteredViewModels = useMemo(() => {
    if (!articleViewModels) return [];
    const q = query.trim().toLowerCase();
    return articleViewModels.filter((vm) => {
      if (categorySlug && vm.categorySlug !== categorySlug) return false;
      if (!q) return true;
      return (
        vm.title.toLowerCase().includes(q) || vm.excerpt.toLowerCase().includes(q)
      );
    });
  }, [articleViewModels, categorySlug, query]);

  const displayCategories = useViewModels
    ? categories
    : (knowledgeBase?.categories ?? []).map((cat) => ({
        id: cat.id,
        slug: cat.slug,
        title: pickLocale(cat, "title", locale),
        articleCount: cat.articleCount ?? 0,
      }));

  const kbSlug = knowledgeBaseSlug ?? knowledgeBase?.slug ?? "";
  const articleCount = useViewModels ? filteredViewModels.length : legacyArticles.length;

  return (
    <div className={cn("pb-kb", `pb-kb--${layout}`)}>
      {title && <h2 className="pb-kb__title font-heading text-2xl font-bold">{title}</h2>}
      {subtitle && <p className="pb-kb__subtitle text-muted-foreground mb-4">{subtitle}</p>}
      {showSearch && (
        <Input
          className="pb-kb__search mb-4 max-w-md"
          placeholder={portalSearchPlaceholder("articles", locale)}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      <div
        className={
          layout === "sidebar"
            ? "pb-kb__body grid gap-6 lg:grid-cols-[220px_1fr]"
            : "pb-kb__body"
        }
      >
        {showCategories && displayCategories.length > 0 && (
          <nav className="pb-kb__categories space-y-1">
            <button
              type="button"
              className={cn(
                "block w-full text-start text-sm px-2 py-1 rounded-md",
                !categorySlug && "bg-primary/10 text-primary font-medium",
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
                  "block w-full text-start text-sm px-2 py-1 rounded-md",
                  categorySlug === cat.slug && "bg-primary/10 text-primary font-medium",
                )}
                onClick={() => setCategorySlug(cat.slug)}
              >
                {cat.title}
                <span className="text-muted-foreground ms-1">({cat.articleCount})</span>
              </button>
            ))}
          </nav>
        )}
        <ul
          className={cn(
            "pb-kb__articles",
            layout === "grid" && "grid gap-4 sm:grid-cols-2",
            layout === "list" && "space-y-3",
            layout === "sidebar" && "space-y-3",
          )}
        >
          {useViewModels
            ? filteredViewModels.map((vm) => (
                <li key={vm.entityId}>
                  <KnowledgeArticleCardTemplate
                    viewModel={vm}
                    showRatings={showRatings}
                  />
                </li>
              ))
            : legacyArticles.map((article) => {
                const rating =
                  article.ratingCount > 0
                    ? (article.ratingSum / article.ratingCount).toFixed(1)
                    : null;
                return (
                  <li key={article.id}>
                    <Link
                      href={`${basePath}/${kbSlug}/${article.slug}`}
                      className="pb-kb__article block rounded-lg border p-4 hover:border-primary/40 transition-colors"
                    >
                      <h3 className="font-medium">{pickLocale(article, "title", locale)}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {pickLocale(article, "excerpt", locale)}
                      </p>
                      {showRatings && rating && (
                        <span className="text-xs text-muted-foreground mt-2 inline-block">
                          ★ {rating}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
        </ul>
      </div>
      {articleCount === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {portalNoArticlesLabel(locale)}
        </p>
      )}
    </div>
  );
}
