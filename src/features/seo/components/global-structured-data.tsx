import { JsonLd } from "@/lib/seo";
import { seoService } from "@/features/seo/seo.service";
import type { SeoStructuredConfig } from "@/features/seo/types";

function renderStructuredJsonLd(config: SeoStructuredConfig | null) {
  if (!config) return null;
  const items: Record<string, unknown>[] = [];
  if (config.organization) items.push(config.organization);
  if (config.website) items.push(config.website);
  if (!items.length) return null;
  return <JsonLd data={items.length === 1 ? items[0] : items} />;
}

/** Sync render — config is prefetched in the locale layout to avoid a Suspense stream swap. */
export function GlobalStructuredDataSync({
  config,
}: {
  config: SeoStructuredConfig | null;
}) {
  return renderStructuredJsonLd(config);
}

export async function GlobalStructuredData() {
  let config: Awaited<ReturnType<typeof seoService.getGlobalStructured>>;
  try {
    config = await seoService.getGlobalStructured();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[GlobalStructuredData] load failed:", errMsg);
    return null;
  }
  return renderStructuredJsonLd(config);
}
