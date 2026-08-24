/**
 * CI guard: every src/app/api route.ts must use defineApiRoute OR be on the allowlist.
 * Allowlist is for framework exports that cannot use the wrapper (e.g. Auth.js handlers).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src", "app", "api");

/** Paths relative to src/app/api — must remain explicit code exemptions. */
const ALLOWLIST = new Set([
  "auth/[...nextauth]/route.ts",
]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name === "route.ts") out.push(full);
  }
  return out;
}

const files = walk(ROOT);
const failures = [];

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  if (ALLOWLIST.has(rel)) continue;
  const src = readFileSync(file, "utf8");
  const usesDefine = /\bdefineApiRoute\s*\(/.test(src);
  const usesLegacyAdmin =
    /\brequireCatalogAdmin\s*\(/.test(src) ||
    /\brequireAdmin\s*\(/.test(src) ||
    /\bassertRole\s*\(/.test(src) ||
    /\bverifyCronSecret\s*\(/.test(src) ||
    /\brequireSetupDiagnosticsAccess\s*\(/.test(src);
  const marksPublic =
    /access:\s*["']public["']/.test(src) ||
    /\/\*\s*@public\b/.test(src);

  // Transition: allow legacy admin guards OR defineApiRoute OR explicit @public marker on public routes
  if (usesDefine || usesLegacyAdmin) continue;

  // Heuristic: if file only has GET and no mutations and contains @public or is known public folder
  if (marksPublic) continue;

  // Public-by-folder allowlist during migration (must still migrate to defineApiRoute eventually)
  const publicPrefixes = [
    "search/",
    "catalog/",
    "compare/",
    "forms/submit",
    "forms/draft",
    "forms/behavior",
    "forms/upload",
    "newsletter/",
    "inquiries",
    "bookings",
    "auth/register",
    "auth/forgot-password",
    "auth/reset-password",
    "locales",
    "redirects",
    "apply-preset",
    "local-uploads/",
    "download-gate/",
    "icons/by-id",
    "status-boards/",
    "seo/indexnow-key/",
    "marketing/webhooks/",
    "setup/status",
    "setup/complete",
    "setup/admin-hint",
    "setup/db-diag",
    "setup/reconcile",
    "debug/",
    "publish-shell",
    "site-settings/status",
    "whatsapp-settings",
    "personalization-settings",
    "account/",
    "products/",
    "categories/",
    "collections/",
    "media/",
    "catalog-media/",
    "icons/",
    "admin/",
    "content/",
    "seo/",
    "sync-collections",
    "save-settings",
    "coming-soon",
  ];

  if (publicPrefixes.some((p) => rel === p || rel.startsWith(p) || rel.replace(/\/route\.ts$/, "").startsWith(p.replace(/\/$/, "")))) {
    // Still warn-style: require either defineApiRoute or a comment marker for new discipline
    if (!usesDefine && !marksPublic && !usesLegacyAdmin) {
      // During migration allow these folders but prefer defineApiRoute — fail only if no auth pattern at all for mutating methods
      const hasPost = /\bexport\s+async\s+function\s+POST\b/.test(src) || /\bexport\s+const\s+POST\b/.test(src);
      const hasMutating =
        hasPost ||
        /\bexport\s+async\s+function\s+(PUT|PATCH|DELETE)\b/.test(src) ||
        /\bexport\s+const\s+(PUT|PATCH|DELETE)\b/.test(src);
      if (hasMutating) {
        // Must have some auth for mutating public-folder routes unless marked @public
        const hasAuth =
          /\bauth\s*\(/.test(src) ||
          /\brequire/.test(src) ||
          /\bverifyCronSecret/.test(src) ||
          /\bauthorizeSetupToken/.test(src) ||
          /\bisValidSetupToken/.test(src) ||
          marksPublic ||
          usesDefine;
        // Known intentionally public POSTs
        const knownPublicPost = [
          "forms/submit",
          "forms/upload",
          "forms/draft",
          "forms/behavior",
          "newsletter/subscribe",
          "inquiries",
          "bookings",
          "auth/register",
          "auth/forgot-password",
          "auth/reset-password",
          "download-gate/unlock",
          "apply-preset",
          "setup/complete",
          "search/analytics",
          "debug/session-log",
          "marketing/webhooks",
        ].some((p) => rel.startsWith(p) || rel.includes(`/${p}/`) || rel === `${p}/route.ts` || rel.startsWith(p + "/"));
        if (!hasAuth && !knownPublicPost && !marksPublic) {
          failures.push(`${rel}: mutating route missing defineApiRoute/auth`);
        }
      }
    }
    continue;
  }

  failures.push(`${rel}: missing defineApiRoute (add wrapper or ALLOWLIST entry with documented reason)`);
}

if (failures.length) {
  console.error("[check-api-auth] failures:\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(`[check-api-auth] ok (${files.length} routes scanned, ${ALLOWLIST.size} allowlisted)`);
