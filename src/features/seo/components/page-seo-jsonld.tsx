import { JsonLd } from "@/lib/seo";
import { seoService } from "@/features/seo/seo.service";
import type { SeoResolveInput } from "@/features/seo/types";

export async function PageSeoJsonLd(props: SeoResolveInput) {
  const data = await seoService.resolveJsonLd(props);
  if (!data) return null;
  return <JsonLd data={data} />;
}
