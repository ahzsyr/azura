import { seoRepository } from "@/repositories/seo.repository";
import type { SeoStructuredConfig } from "@/features/seo/types";
import { StructuredDataSettingsClient } from "@/features/seo/admin/structured-data-settings-client";
import { prisma } from "@/lib/prisma";

export default async function AdminStructuredDataPage() {
  let config: SeoStructuredConfig = {};
  let withJsonLd: { pageKey: string | null; titleEn: string; entityType: string | null }[] = [];

  try {
    [config, withJsonLd] = await Promise.all([
      seoRepository.getStructuredConfig(),
      prisma.seoMeta
        .findMany({
          select: { pageKey: true, titleEn: true, entityType: true, jsonLd: true },
          take: 50,
        })
        .then((rows) => rows.filter((r) => r.jsonLd != null)),
    ]);
  } catch {
    // DB unavailable
  }

  return <StructuredDataSettingsClient config={config} withJsonLd={withJsonLd} />;
}
