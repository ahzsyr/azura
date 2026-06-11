/**
 * Copies src/data/placeholder.svg → public/images/placeholder.svg (Next.js static URL).
 * Source of truth: src/data/placeholder.svg
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src", "data", "placeholder.svg");
const destDir = join(root, "public", "images");
const dest = join(destDir, "placeholder.svg");

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log("synced placeholder.svg → public/images/placeholder.svg");
