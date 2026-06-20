import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { pickLocaleArrayField } from "@/features/content-blocks/lib/locale-field";
import type { changelogReleaseSchema } from "@/features/content-blocks/schemas/content-blocks";
import type { z } from "zod";

type Release = z.infer<typeof changelogReleaseSchema>;

const SECTION_LABELS: Record<keyof Release["sections"], string> = {
  features: "Features",
  improvements: "Improvements",
  fixes: "Fixes",
  breaking: "Breaking changes",
};

const STATUS_STYLES: Record<Release["status"], string> = {
  released: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  beta: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  deprecated: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

type Props = {
  title?: string;
  releases: Release[];
  locale: Locale;
  layout?: "timeline" | "list";
};

export function ChangelogBlockView({ title, releases, locale, layout = "timeline" }: Props) {
  if (releases.length === 0) return null;

  return (
    <div className={cn("cb-changelog", layout === "timeline" && "cb-changelog--timeline", layout === "list" && "cb-changelog--list", "space-y-8")}>
      {title && <h2 className="font-heading text-2xl font-bold">{title}</h2>}
      {releases.map((release) => (
        <article
          key={release.id}
          className={cn(
            "cb-changelog__release rounded-xl border p-6",
            layout === "timeline" && "relative ps-8 before:absolute before:start-3 before:top-0 before:bottom-0 before:w-px before:bg-border"
          )}
        >
          <header className="flex flex-wrap items-center gap-3 mb-4">
            <h3 className="font-heading text-xl font-bold">v{release.version}</h3>
            {release.date && (
              <time className="text-sm text-muted-foreground" dateTime={release.date}>
                {release.date}
              </time>
            )}
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full capitalize", STATUS_STYLES[release.status])}>
              {release.status}
            </span>
            {release.tags.map((tag) => (
              <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </header>
          {(Object.keys(SECTION_LABELS) as (keyof Release["sections"])[]).map((sectionKey) => {
            const entries = release.sections[sectionKey];
            if (!entries?.length) return null;
            return (
              <div key={sectionKey} className="mb-4 last:mb-0">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {SECTION_LABELS[sectionKey]}
                </h4>
                <ul className="list-disc ps-5 space-y-1 text-sm">
                  {entries.map((entry) => (
                    <li key={entry.id}>{pickLocaleArrayField(entry, "text", locale)}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </article>
      ))}
    </div>
  );
}
