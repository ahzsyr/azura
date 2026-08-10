"use client";

import { CatalogEmptyState } from "./catalog-empty-state";

type CatalogComingSoonProps = {
  title: string;
  description: string;
  phaseHint?: string;
};

export function CatalogComingSoon({
  title,
  description,
  phaseHint,
}: CatalogComingSoonProps) {
  return (
    <CatalogEmptyState
      status="empty"
      title={title}
      description={
        phaseHint ? `${description} ${phaseHint}` : description
      }
    />
  );
}
