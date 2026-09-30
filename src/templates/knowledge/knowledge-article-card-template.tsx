"use client";

import type { KnowledgeArticleCardViewModel } from "@/view-models/knowledge-article-card";
import { KnowledgeArticleCardBody } from "@/templates/knowledge/knowledge-article-card-body";

type Props = {
  viewModel: KnowledgeArticleCardViewModel;
  className?: string;
  showRatings?: boolean;
};

export function KnowledgeArticleCardTemplate({ viewModel, className, showRatings }: Props) {
  return (
    <KnowledgeArticleCardBody
      viewModel={viewModel}
      className={className}
      showRatings={showRatings}
    />
  );
}
