import "server-only";

import { resolve } from "node:path";
export function productJsonPath(locale: string, slug: string): string {
  return resolve(process.cwd(), "src", "data", locale, "products", `${slug}.json`);
}

export function legacyProductJsonPath(slug: string): string {
  return resolve(process.cwd(), "src", "data", "products", `${slug}.json`);
}
