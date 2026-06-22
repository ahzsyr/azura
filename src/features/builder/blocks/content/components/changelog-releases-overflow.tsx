"use client";

import type { changelogReleaseSchema } from "@/features/builder/blocks/content/schemas/content-blocks";
import type { z } from "zod";
import type { Locale } from "@/i18n/routing";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";
import { MarketingItemsOverflow } from "@/features/builder/components/marketing-items-overflow";
import { cn } from "@/lib/utils";
import { pickLocaleArrayField } from "@/features/builder/blocks/content/lib/locale-field";

type Release = z.infer<typeof changelogReleaseSchema>;

const STATUS_STYLES: Record<Release["status"], string> = {
  released: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  beta: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  deprecated: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

type Props = {
  releases: Release[];
  locale: Locale;
  layout?: "timeline" | "list";
  block: BlockNode;
  overflow: BlockOverflowContext;
};

export function ChangelogReleasesOverflow({ releases, locale, layout = "timeline", block, overflow }: Props) {
  return (
    <MarketingItemsOverflow
      block={block}
      overflowFlags={overflow.flags}
      previewDevice={overflow.previewDevice}
      items={releases}
      columns={2}
      useSimpleSliderTrack
      gridClassName="space-y-8"
      getItemKey={(r) => r.id}
      renderItem={(release) => (
        <article
          className={cn(
            "cb-changelog__release rounded-xl border p-6 min-w-[280px]",
            layout === "timeline" && "relative ps-8"
          )}
        >
          <header className="flex flex-wrap items-center gap-3 mb-4">
            <h3 className="font-heading text-xl font-bold">v{release.version}</h3>
            {release.date && (
              <time className="text-sm text-muted-foreground" dateTime={release.date}>
                {release.date}
              </time>
            )}
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                STATUS_STYLES[release.status]
              )}
            >
              {release.status}
            </span>
          </header>
          {pickLocaleArrayField(release, "summary", locale) && (
            <p className="text-muted-foreground mb-4">{pickLocaleArrayField(release, "summary", locale)}</p>
          )}
        </article>
      )}
      accordionRender={(release) => ({
        title: `v${release.version}`,
        body: pickLocaleArrayField(release, "summary", locale) ?? "",
      })}
    />
  );
}
