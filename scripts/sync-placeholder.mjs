/**
 * Copies seeds/catalog/placeholder.svg → public/images/placeholder.svg (Next.js static URL).
 * Source of truth: seeds/catalog/placeholder.svg
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "seeds", "catalog", "placeholder.svg");
const destDir = join(root, "public", "images");
const dest = join(destDir, "placeholder.svg");
const destLegacy = join(destDir, "placeholder-product.svg");

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
copyFileSync(src, destLegacy);
console.log("synced placeholder.svg → public/images/placeholder.svg");
console.log("synced placeholder.svg → public/images/placeholder-product.svg");
