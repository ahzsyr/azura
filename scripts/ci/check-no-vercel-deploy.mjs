#!/usr/bin/env node
/**
 * Fail if Vercel deploy scripts / vercel.json reappear.
 * Hostinger is the sole production deployment target.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const banned = [
  "vercel.json",
  "scripts/deploy/vercel-next-build.mjs",
  "src/lib/cloud-native-guard.ts",
];

const found = banned.filter((rel) => existsSync(join(ROOT, rel)));
if (found.length) {
  console.error("Banned Vercel/cloud-native deploy artifacts present:\n" + found.join("\n"));
  process.exit(1);
}

console.log("No Vercel deploy path: OK");
