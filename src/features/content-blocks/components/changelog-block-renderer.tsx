import "server-only";

import type { Locale } from "@/i18n/routing";
import { resolveReleasesForBlock } from "@/features/releases/resolve-releases-for-block";
import { changelogPropsSchema } from "@/features/content-blocks/schemas/content-blocks";
import { mapReleaseSetToChangelogReleases } from "@/features/content-blocks/lib/map-release-set-to-changelog";
import { ChangelogBlockView } from "@/features/content-blocks/components/changelog-block-view";
import { ChangelogReleasesOverflow } from "@/features/content-blocks/components/changelog-releases-overflow";
import { pickLocaleField } from "@/features/content-blocks/lib/locale-field";
import type { BlockNode } from "@/types/builder";
import type { BlockOverflowContext } from "@/features/builder/components/marketing-items-overflow";

type Props = {
  locale: Locale;
  props: Record<string, unknown>;
  loc?: (key: string) => string;
  block?: BlockNode;
  overflow?: BlockOverflowContext;
};

export async function ChangelogBlockRenderer({ locale, props, loc, block, overflow }: Props) {
  const p = changelogPropsSchema.parse(props);
  const title =
    (loc?.("title") ?? "") ||
    pickLocaleField(p as Record<string, unknown>, "title", locale);

  let releases = p.releases;
  if (p.releaseSetSlug) {
    const set = await resolveReleasesForBlock({ releaseSetSlug: p.releaseSetSlug });
    if (set) {
      releases = mapReleaseSetToChangelogReleases(set, {
        filterTags: p.filterTags,
        filterStatuses: p.filterStatuses,
      });
    }
  }

  if (block && overflow) {
    return (
      <div>
        {title ? <h2 className="font-heading text-2xl font-bold mb-8">{title}</h2> : null}
        <ChangelogReleasesOverflow
          releases={releases}
          locale={locale}
          layout={p.layout}
          block={block}
          overflow={overflow}
        />
      </div>
    );
  }

  return (
    <ChangelogBlockView
      title={title || undefined}
      releases={releases}
      locale={locale}
      layout={p.layout}
    />
  );
}
