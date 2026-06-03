import { JsonLd } from "@/lib/seo";
import { seoService } from "@/features/seo/seo.service";

export async function GlobalStructuredData() {
  const config = await seoService.getGlobalStructured();
  const items: Record<string, unknown>[] = [];
  if (config.organization) items.push(config.organization);
  if (config.website) items.push(config.website);
  if (!items.length) return null;
  return <JsonLd data={items.length === 1 ? items[0] : items} />;
}
