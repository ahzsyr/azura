#!/usr/bin/env node
/** Log sanitized DATABASE_URL at startup (Hostinger runtime debugging). */
import { buildPrismaEnv } from "./load-database-url.mjs";

const env = buildPrismaEnv();
const url = env.DATABASE_URL?.trim() ?? "";
if (!url) {
  console.warn("[prestart] DATABASE_URL is unset — check hPanel env vars");
  process.exit(0);
}

const host = url.match(/@([^/:?]+)/)?.[1] ?? "unset";
const user = url.match(/\/\/([^:]+):/)?.[1] ?? "unset";
const projectRef = user.includes(".") ? user.split(".")[1] : user;
const safe = url.replace(/:([^:@/]+)@/, ":***@");

console.log(`[prestart] DATABASE_URL resolved: ${safe}`);
console.log(`[prestart] pooler host=${host} projectRef=${projectRef}`);

if (projectRef === "ugiepgwgluwpktmngklp") {
  console.warn(
    "[prestart] WARNING: old Supabase project ref detected — update hPanel DATABASE_URL to xxvvokguzrcrshplzqwp",
  );
}
