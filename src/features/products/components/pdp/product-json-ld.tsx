import { JsonLd } from "@/lib/seo";
import type { Product } from "../../types";
import {
  buildProductBreadcrumbJsonLd,
  buildProductJsonLd,
  type BreadcrumbItem,
} from "../../lib/product-json-ld";

type Props = {
  product: Product;
  canonicalUrl: string;
  breadcrumbs: BreadcrumbItem[];
  siteOrigin: string;
};

export function ProductJsonLd({ product, canonicalUrl, breadcrumbs, siteOrigin }: Props) {
  const productLd = buildProductJsonLd(product, canonicalUrl);
  const breadcrumbLd = buildProductBreadcrumbJsonLd(siteOrigin, breadcrumbs);

  return <JsonLd data={[productLd, breadcrumbLd]} />;
}