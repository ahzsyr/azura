import "server-only";

import { useDatabaseOnlyCatalog } from "@/features/catalog/catalog-data-source";

export type CatalogProductsSource = "filesystem" | "db";

export function catalogProductsSource(): CatalogProductsSource {
  return useDatabaseOnlyCatalog() ? "db" : "filesystem";
}

/** True when catalog products are stored in Prisma Product table (Supabase). */
export function useCatalogProductsDb(): boolean {
  return useDatabaseOnlyCatalog();
}
