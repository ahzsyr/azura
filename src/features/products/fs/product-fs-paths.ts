import "server-only";

import { resolve } from "node:path";
import { catalogSeedRoot } from "@/lib/catalog-seed-paths";

export function productJsonPath(locale: string, slug: string): string {
  return resolve(catalogSeedRoot(), locale, "products", `${slug}.json`);
}

export function legacyProductJsonPath(slug: string): string {
  return resolve(catalogSeedRoot(), "products", `${slug}.json`);
}
