"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SearchPageDesignSettings } from "@/features/search/settings/admin-search-settings.schema";
import {
  SEARCH_PAGE_TEMPLATE_PRESETS,
  applySearchPagePreset,
  type SearchPageTemplateId,
} from "@/features/search/lib/search-page-presets";

type Props = {
  page: SearchPageDesignSettings;
  onApply: (page: SearchPageDesignSettings) => void;
};

export function SearchTemplateGallery({ page, onApply }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SEARCH_PAGE_TEMPLATE_PRESETS.map((preset) => {
        const active = page.template === preset.id;
        return (
          <div
            key={preset.id}
            className={cn(
              "flex flex-col rounded-lg border p-4 transition-colors",
              active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30",
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">{preset.label}</h4>
              {active ? (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Active
                </span>
              ) : null}
            </div>
            <p className="mb-3 flex-1 text-xs text-muted-foreground">{preset.description}</p>
            <Button
              type="button"
              variant={active ? "secondary" : "outline"}
              size="sm"
              onClick={() => onApply(applySearchPagePreset(page, preset.id) as SearchPageDesignSettings)}
            >
              {active ? "Reapply" : "Apply template"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export type { SearchPageTemplateId };
