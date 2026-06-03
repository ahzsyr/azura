import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { CatalogCard } from "@/components/catalog/catalog-card";
import { SectionHeader } from "@/components/marketing/section";
import { getLocalizedField } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { mergeDisplaySettings, type DisplaySettings } from "@/schemas/catalog/display-settings";
import { loadCatalogItems, type CatalogBlockConfig } from "@/features/catalog/catalog-data.service";
import type { CatalogCardData } from "@/features/catalog/types";
import { cn } from "@/lib/utils";

type CatalogBlockProps = {
  locale: Locale;
  title?: string;
  subtitle?: string;
  config: CatalogBlockConfig;
  displaySettings?: Partial<DisplaySettings> | Record<string, unknown>;
  viewAllHref?: string;
  emptyMessage?: string;
  previewMode?: boolean;
};

export async function CatalogBlockRenderer({
  locale,
  title,
  subtitle,
  config,
  displaySettings,
  viewAllHref,
  emptyMessage,
  previewMode,
}: CatalogBlockProps) {
  const settings = mergeDisplaySettings(displaySettings);
  const [items, t] = await Promise.all([
    loadCatalogItems({ ...config, limit: settings.limit ?? config.limit }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  if (items.length === 0) {
    if (previewMode) {
      return (
        <p className="text-center text-sm text-muted-foreground">
          {emptyMessage || "No items to display."}
        </p>
      );
    }
    return null;
  }

  const colClass = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  }[settings.columns];

  const grid = (
    <div className={cn("grid gap-6", colClass)}>
      {items.map((item: CatalogCardData) => (
        <CatalogCard
          key={item.id}
          item={item}
          locale={locale}
          displaySettings={settings}
          linkMode={previewMode ? "locale-path" : "i18n"}
        />
      ))}
    </div>
  );

  return (
    <div>
      {(title || subtitle) && (
        <SectionHeader title={title ?? ""} subtitle={subtitle} />
      )}
      <div className={title || subtitle ? "mt-8" : undefined}>
        {settings.layoutMode === "slider" ? (
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
            {items.map((item: CatalogCardData) => (
              <div key={item.id} className="min-w-[280px] max-w-sm snap-start shrink-0">
                <CatalogCard
                  item={item}
                  locale={locale}
                  displaySettings={settings}
                  linkMode={previewMode ? "locale-path" : "i18n"}
                />
              </div>
            ))}
          </div>
        ) : (
          grid
        )}
      </div>
      {settings.showViewAllLink && viewAllHref && (
        <div className="mt-8 text-center">
          <Button asChild variant="outline">
            <Link href={viewAllHref}>{t("viewAll")}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

