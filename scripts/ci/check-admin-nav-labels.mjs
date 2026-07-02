#!/usr/bin/env node
/**
 * CI guard: banned admin nav labels must not appear in src/config/admin-nav.ts
 */
import fs from "node:fs";
import path from "node:path";

const navFile = path.join(process.cwd(), "src", "config", "admin-nav.ts");
const content = fs.readFileSync(navFile, "utf8");

const banned = [
  { pattern: /label:\s*["']Product Catalog["']/, message: 'group label "Product Catalog"' },
  { pattern: /label:\s*["']Catalog Items["']/, message: 'item label "Catalog Items"' },
  { pattern: /label:\s*["']Listings["']/, message: 'item label "Listings"' },
  { pattern: /label:\s*["']Offerings["']/, message: 'item label "Offerings"' },
  { pattern: /id:\s*["']product-catalog["']/, message: 'group id "product-catalog"' },
  { pattern: /id:\s*["']catalog["'],\s*\n\s*label:\s*["']Catalog["']/, message: 'standalone Catalog group' },
];

let failures = 0;
for (const { pattern, message } of banned) {
  if (pattern.test(content)) {
    console.error(`  VIOLATION: banned admin nav ${message}`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\ncheck-admin-nav-labels: ${failures} violation(s)`);
  process.exit(1);
}

console.log("check-admin-nav-labels: ok");
