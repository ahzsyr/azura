/**
 * Fail if .env.example contains live-looking Google OAuth secrets or documents
 * product OAuth credentials as host env vars (those belong in Admin → SEO).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const path = join(process.cwd(), ".env.example");
const text = readFileSync(path, "utf8");

const failures = [];

if (/GOCSPX-[A-Za-z0-9_-]{20,}/.test(text) && !/GOCSPX-your-client-secret-placeholder/.test(text)) {
  failures.push("Suspicious GOCSPX- secret in .env.example");
}

if (/GOOGLE_SEARCH_CONSOLE_CLIENT_ID=\d{10,}-[a-z0-9]+\.apps\.googleusercontent\.com/.test(text)) {
  failures.push("Looks like a real Google OAuth client id in .env.example — use a placeholder");
}

if (/^\s*GOOGLE_SEARCH_CONSOLE_CLIENT_(ID|SECRET)=/m.test(text)) {
  failures.push(
    "GOOGLE_SEARCH_CONSOLE_CLIENT_* must not be set in .env.example — configure OAuth in Admin → SEO → Google",
  );
}

if (failures.length) {
  console.error("[check-env-secrets]\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log("[check-env-secrets] ok");
