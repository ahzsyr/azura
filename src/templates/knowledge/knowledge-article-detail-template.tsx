"use client";

import type { KnowledgeArticleDetailViewModel } from "@/view-models/knowledge-article-detail";

type Props = {
  viewModel: KnowledgeArticleDetailViewModel;
};

/** Article body template — Versioning Capability integration deferred to Phase 6. */
export function KnowledgeArticleDetailTemplate({ viewModel }: Props) {
  return (
    <article className="knowledge-article-detail">
      <header className="mb-6">
        <h1 className="font-heading text-3xl font-bold">{viewModel.title}</h1>
        {viewModel.excerpt && (
          <p className="text-muted-foreground mt-2 text-lg">{viewModel.excerpt}</p>
        )}
        {viewModel.ratingAverage != null && viewModel.ratingCount > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            ★ {viewModel.ratingAverage.toFixed(1)} ({viewModel.ratingCount})
          </p>
        )}
      </header>
      {viewModel.body && (
        <div
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: viewModel.body }}
        />
      )}
    </article>
  );
}
