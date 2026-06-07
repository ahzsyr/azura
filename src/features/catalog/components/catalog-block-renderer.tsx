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
import type { DeviceBreakpoint, ResolvedContentOverflow } from "@/types/block-system";
import { CatalogItemsOverflowLayout } from "@/features/catalog/components/catalog-items-overflow-layout";
import { resolveContentOverflowCssFlags } from "@/features/builder/styles/content-overflow-resolver";
import type { BlockNode } from "@/types/builder";
import { LEGACY_SOURCE_TO_TYPE } from "@/features/content/content-type.registry";
import { loadComparePropsForContentType } from "@/features/comparison/load-compare-props";
import { prisma } from "@/lib/prisma";

type CatalogBlockProps = {
  locale: Locale;
  title?: string;
  subtitle?: string;
  config: CatalogBlockConfig;
  displaySettings?: Partial<DisplaySettings> | Record<string, unknown>;
  viewAllHref?: string;
  emptyMessage?: string;
  previewMode?: boolean;
  overflowFlags?: Record<DeviceBreakpoint, ResolvedContentOverflow>;
  previewDevice?: DeviceBreakpoint;
  /** When provided, resolves overflow flags from block responsive settings */
  block?: BlockNode;
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
  overflowFlags,
  previewDevice,
  block,
}: CatalogBlockProps) {
  const settings = mergeDisplaySettings(displaySettings);
  const typeSlug = LEGACY_SOURCE_TO_TYPE[config.source];
  const [items, t, contentTypeRow] = await Promise.all([
    loadCatalogItems({ ...config, limit: settings.limit ?? config.limit }),
    getTranslations({ locale, namespace: "common" }),
    typeSlug
      ? prisma.contentType.findUnique({ where: { slug: typeSlug } })
      : Promise.resolve(null),
  ]);

  const compare = contentTypeRow
    ? loadComparePropsForContentType({
        slug: contentTypeRow.slug,
        fieldSchema: contentTypeRow.fieldSchema,
        adminConfig: contentTypeRow.adminConfig,
        locale,
      })
    : undefined;

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

  const flags = overflowFlags ?? (block ? resolveContentOverflowCssFlags(block) : undefined);

  const itemsLayout =
    flags != null ? (
      <CatalogItemsOverflowLayout
        items={items}
        locale={locale}
        displaySettings={settings}
        flags={flags}
        previewMode={previewMode}
        compare={compare}
        previewDevice={previewDevice}
      />
    ) : (
      <CatalogItemsOverflowLayout
        items={items}
        locale={locale}
        displaySettings={settings}
        flags={resolveContentOverflowCssFlags({
          id: "catalog-fallback",
          type: "catalog",
          props: { displaySettings: settings },
        })}
        previewMode={previewMode}
        compare={compare}
        previewDevice={previewDevice}
      />
    );

  return (
    <div>
      {(title || subtitle) && (
        <SectionHeader title={title ?? ""} subtitle={subtitle} />
      )}
      <div className={title || subtitle ? "mt-8" : undefined}>{itemsLayout}</div>
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

