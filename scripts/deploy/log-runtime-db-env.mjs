#!/usr/bin/env node
/** Log sanitized DATABASE_URL at startup (Hostinger runtime debugging). */
import { buildPrismaEnv } from "./load-database-url.mjs";

const env = buildPrismaEnv();
const url = env.DATABASE_URL?.trim() ?? "";
if (!url) {
  console.warn("[prestart] DATABASE_URL is unset — check hPanel env vars");
  process.exit(0);
}

let host = "unset";
let dbName = "unset";
let user = "unset";
try {
  const parsed = new URL(url);
  host = parsed.hostname || "unset";
  dbName = parsed.pathname.replace(/^\//, "").split("?")[0] || "unset";
  user = decodeURIComponent(parsed.username || "unset");
} catch {
  host = url.match(/@([^/:?]+)/)?.[1] ?? "unset";
  user = url.match(/\/\/([^:]+):/)?.[1] ?? "unset";
  dbName = url.match(/\/([^/?]+)(?:\?|$)/)?.[1] ?? "unset";
}

const projectRef = user.includes(".") ? user.split(".")[1] : user;
const safe = url.replace(/:([^:@/]+)@/, ":***@");
const localhostFlag = process.env.HOSTINGER_MYSQL_LOCALHOST?.trim() || "(unset)";
const mysqlHostOverride = process.env.DATABASE_MYSQL_HOST?.trim() || "(unset)";

console.log(`[prestart] DATABASE_URL resolved: ${safe}`);
console.log(
  `[prestart] db host=${host} database=${dbName} user=${projectRef} HOSTINGER_MYSQL_LOCALHOST=${localhostFlag} DATABASE_MYSQL_HOST=${mysqlHostOverride}`,
);

if (/^srv\d+\.hstgr\.io$/i.test(host) && localhostFlag !== "1" && localhostFlag !== "true" && mysqlHostOverride === "(unset)") {
  console.warn(
    "[prestart] WARNING: Hostinger remote MySQL host without localhost override — set HOSTINGER_MYSQL_LOCALHOST=1 (or DATABASE_MYSQL_HOST=localhost) if the Node app cannot reach srv*.hstgr.io",
  );
}

if (projectRef === "ugiepgwgluwpktmngklp") {
  console.warn(
    "[prestart] WARNING: old Supabase project ref detected — update hPanel DATABASE_URL to a MySQL URI for this site",
  );
}
