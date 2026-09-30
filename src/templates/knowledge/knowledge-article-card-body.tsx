"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { KnowledgeArticleCardViewModel } from "@/view-models/knowledge-article-card";

type Props = {
  viewModel: KnowledgeArticleCardViewModel;
  className?: string;
  showRatings?: boolean;
};

export function KnowledgeArticleCardBody({ viewModel, className, showRatings = true }: Props) {
  const rating =
    showRatings && viewModel.ratingAverage != null
      ? viewModel.ratingAverage.toFixed(1)
      : null;

  return (
    <Link
      href={viewModel.href}
      className={cn(
        "pb-kb__article block rounded-lg border p-4 hover:border-primary/40 transition-colors",
        className,
      )}
    >
      <h3 className="font-medium">{viewModel.title}</h3>
      {viewModel.excerpt && (
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{viewModel.excerpt}</p>
      )}
      {rating && (
        <span className="text-xs text-muted-foreground mt-2 inline-block">★ {rating}</span>
      )}
    </Link>
  );
}
