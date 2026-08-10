#!/usr/bin/env node
/**
 * URL-encode a MySQL password for use in DATABASE_URL.
 * Usage: node scripts/deploy/encode-db-password.mjs "Brttradingllc@2026"
 */
const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/deploy/encode-db-password.mjs <password>");
  process.exit(1);
}
console.log(encodeURIComponent(password));
