"use client";

import ProductManagerApp from "@/features/catalog/admin/products/ProductManagerApp";
import type { ProductsAdminInitialProps } from "@/features/catalog/admin/load-products-admin-props";

export function CatalogProductsClient(props: ProductsAdminInitialProps) {
  return <ProductManagerApp {...props} />;
}
