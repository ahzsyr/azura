"use client";

import type { TabbedShowcaseTab } from "@/features/builder/blocks/marketing/schemas/marketing-blocks";
import { resolveMarketingIcon } from "@/features/builder/blocks/marketing/lib/icon-map";
import { resolveItemField } from "@/features/builder/blocks/marketing/lib/resolve-item-locale";

type Props = {
  tab: TabbedShowcaseTab;
  locale: string;
};

export function TabbedShowcasePanel({ tab, locale }: Props) {
  const title = resolveItemField(tab, "title", locale);
  const features = tab.features.filter(
    (feature) => resolveItemField(feature, "description", locale) || feature.icon,
  );

  return (
    <div className="flex h-full flex-col justify-center">
      {title ? (
        <>
          <h3 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {title}
          </h3>
          <hr className="my-5 border-border/60" />
        </>
      ) : null}

      <ul className="space-y-6">
        {features.map((feature) => {
          const Icon = resolveMarketingIcon(feature.icon);
          const description = resolveItemField(feature, "description", locale);

          return (
            <li key={feature.id} className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center text-muted-foreground">
                <Icon className="h-10 w-10" aria-hidden="true" />
              </span>
              {description ? (
                <p className="pt-1 text-base leading-relaxed text-foreground/80">{description}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
