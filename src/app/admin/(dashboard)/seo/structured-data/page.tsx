import { seoRepository } from "@/repositories/seo.repository";
import type { SeoStructuredConfig } from "@/features/seo/types";
import { StructuredDataSettingsClient } from "@/features/seo/admin/structured-data-settings-client";
import { prisma } from "@/lib/prisma";
import { loadTranslationsMap, localizedFieldValue } from "@/features/translation/bilingual-serialize";

export default async function AdminStructuredDataPage() {
  let config: SeoStructuredConfig = {};
  let withJsonLd: { pageKey: string | null; titleEn: string; entityType: string | null }[] = [];

  try {
    config = await seoRepository.getStructuredConfig();
    const rows = await prisma.seoMeta.findMany({
      select: { id: true, pageKey: true, entityType: true, jsonLd: true },
      take: 50,
    });
    const withLd = rows.filter((r) => r.jsonLd != null);
    const translations = await loadTranslationsMap(
      "SeoMeta",
      withLd.map((r) => r.id)
    );
    withJsonLd = withLd.map((row) => ({
      pageKey: row.pageKey,
      entityType: row.entityType,
      titleEn:
        localizedFieldValue(translations.get(row.id) ?? [], "metaTitle") || row.pageKey || "",
    }));
  } catch {
    // DB unavailable
  }

  return <StructuredDataSettingsClient config={config} withJsonLd={withJsonLd} />;
}
