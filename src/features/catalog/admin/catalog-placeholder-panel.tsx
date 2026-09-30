"use client";

import { CatalogComingSoon } from "./ui/catalog-coming-soon";
import { CatalogPageHeader } from "./ui/catalog-page-header";

type CatalogPlaceholderPanelProps = {
  title: string;
  description: string;
  comingSoonTitle: string;
  comingSoonDescription: string;
  phaseHint: string;
};

export function CatalogPlaceholderPanel({
  title,
  description,
  comingSoonTitle,
  comingSoonDescription,
  phaseHint,
}: CatalogPlaceholderPanelProps) {
  return (
    <div className="space-y-6">
      <CatalogPageHeader title={title} description={description} />
      <CatalogComingSoon
        title={comingSoonTitle}
        description={comingSoonDescription}
        phaseHint={phaseHint}
      />
    </div>
  );
}
