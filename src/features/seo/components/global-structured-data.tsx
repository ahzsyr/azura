import { JsonLd } from "@/lib/seo";
import { seoService } from "@/features/seo/seo.service";

export async function GlobalStructuredData() {
  let config: Awaited<ReturnType<typeof seoService.getGlobalStructured>>;
  try {
    config = await seoService.getGlobalStructured();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[GlobalStructuredData] load failed:", errMsg);
    return null;
  }
  const items: Record<string, unknown>[] = [];
  if (config.organization) items.push(config.organization);
  if (config.website) items.push(config.website);
  if (!items.length) return null;
  return <JsonLd data={items.length === 1 ? items[0] : items} />;
}
