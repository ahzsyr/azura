#!/usr/bin/env node
/**
 * Phase 7 — Advanced SEO ownership inventory.
 *
 * Usage:
 *   node scripts/platform/inventory-advanced-seo-ownership.mjs
 *   node scripts/platform/inventory-advanced-seo-ownership.mjs --write
 *   node scripts/platform/inventory-advanced-seo-ownership.mjs --json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(root, "docs/modules-v2/inventories/advanced-seo-ownership.json");

// Manifest is TS — read adminRoutes from source text to avoid TS loader.
function readAdvancedAdminRoutes() {
  const src = fs.readFileSync(
    path.join(root, "src/modules/advanced-seo/manifest.ts"),
    "utf8",
  );
  const block = src.match(/adminRoutes:\s*\[([\s\S]*?)\],/);
  if (!block) throw new Error("adminRoutes not found in advanced-seo manifest");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

const ADVANCED_PREFIXES = readAdvancedAdminRoutes();

const PAGE_GUARD = /requireAdvancedSeoPage/;
const API_GUARD = /advancedSeoApiGuardResponse/;
const MUTATION_GUARD = /assertAdvancedSeoMutationAllowed/;
const SOFT_GUARD = /isAdvancedSeoMutationAllowed/;

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function walkFiles(dir, pred, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, pred, out);
    else if (pred(entry.name, full)) out.push(full);
  }
  return out;
}

function fileRouteFromAdminPage(abs) {
  const rel = toPosix(path.relative(path.join(root, "src/app/admin/(dashboard)"), abs));
  // seo/templates/page.tsx → /admin/seo/templates
  const withoutPage = rel.replace(/\/page\.tsx$/, "").replace(/\/page\.ts$/, "");
  return `/admin/${withoutPage}`;
}

function fileRouteFromApi(abs) {
  const rel = toPosix(path.relative(path.join(root, "src/app"), abs));
  return `/${rel.replace(/\/route\.tsx?$/, "")}`;
}

function matchesAdvancedPrefix(adminPath) {
  return ADVANCED_PREFIXES.some(
    (prefix) => adminPath === prefix || adminPath.startsWith(`${prefix}/`),
  );
}

function classifyAdminPage(adminPath) {
  if (adminPath === "/admin/seo/integrations") return "shared-shell";
  if (matchesAdvancedPrefix(adminPath)) {
    if (adminPath.includes("/search-intelligence")) return "search-intelligence-as-advanced";
    return "advanced-seo";
  }
  return "core-basic";
}

/** Known Advanced mutation API paths (admin/session, not public cron). */
const ADVANCED_API_PREFIXES = [
  "/api/seo/analyze",
  "/api/seo/simulate",
  "/api/seo/debug",
  "/api/seo/analytics/google/oauth",
];

function classifyApi(apiPath) {
  if (ADVANCED_API_PREFIXES.some((p) => apiPath === p || apiPath.startsWith(`${p}/`))) {
    return "advanced-seo";
  }
  return "core-basic";
}

function extractExportedActions(source) {
  const names = [];
  const re = /export async function ([A-Za-z0-9_]+)/g;
  let m;
  while ((m = re.exec(source))) names.push(m[1]);
  return names;
}

function actionBody(source, name) {
  const start = source.indexOf(`export async function ${name}`);
  if (start < 0) return "";
  const next = source.indexOf("\nexport async function", start + 1);
  return source.slice(start, next > 0 ? next : undefined);
}

/** Actions that must assert Advanced SEO (mutation / queue / google write). */
const ADVANCED_ACTION_FILES = [
  {
    path: "src/features/seo/actions.ts",
    owner: "advanced-seo",
    required: [
      "upsertSeoAppearanceAction",
      "upsertCustom404Action",
      "upsertSeoIntegrationsAction",
      "upsertGoogleIntegrationAction",
      "enqueueSitemapSubmissionAction",
      "runSeoSubmissionQueueAction",
      "submitSitemapAndRunAction",
      "runSeoAnalyticsIngestionAction",
    ],
  },
  {
    path: "src/features/seo/google-platform/actions.ts",
    owner: "advanced-seo",
    required: [
      "upsertGoogleGlobalSettingsAction",
      "upsertGoogleServiceConfigAction",
      "upsertGoogleServicePolicyAction",
      "runGoogleOperationAction",
      "testGoogleIntegrationAction",
      "disconnectGoogleIntegrationAction",
    ],
  },
  {
    path: "src/features/search-intelligence/workspaces/actions.ts",
    owner: "search-intelligence-as-advanced",
    required: "all-mutations",
  },
  {
    path: "src/features/search-intelligence/content-intelligence/actions.ts",
    owner: "search-intelligence-as-advanced",
    required: "all-mutations",
  },
];

const CORE_ACTION_SAMPLES = [
  { path: "src/features/seo/actions.ts", name: "upsertRedirectAction", owner: "core-basic" },
  { path: "src/features/seo/workspace/actions.ts", name: "runSiteAuditAction", owner: "core-basic" },
  { path: "src/features/seo/operator/actions.ts", name: "setSeoTaskStatusAction", owner: "core-basic" },
];

function buildInventory() {
  const rows = [];
  const gaps = [];

  const pages = walkFiles(
    path.join(root, "src/app/admin/(dashboard)/seo"),
    (name) => name === "page.tsx" || name === "page.ts",
  );
  for (const abs of pages.sort()) {
    const adminPath = fileRouteFromAdminPage(abs);
    const rel = toPosix(path.relative(root, abs));
    const source = fs.readFileSync(abs, "utf8");
    const owner = classifyAdminPage(adminPath);
    const needsPageGuard =
      owner === "advanced-seo" || owner === "search-intelligence-as-advanced";
    const guardPresent = PAGE_GUARD.test(source);
    const softPresent = SOFT_GUARD.test(source);
    const row = {
      path: rel,
      kind: "page",
      route: adminPath,
      owner,
      guardPresent: needsPageGuard ? guardPresent : owner === "shared-shell" ? softPresent || true : true,
      guardKind: needsPageGuard
        ? "requireAdvancedSeoPage"
        : owner === "shared-shell"
          ? "isAdvancedSeoMutationAllowed-soft"
          : "none-expected",
      notes: "",
    };
    if (needsPageGuard && !guardPresent) {
      row.notes = "GAP: Advanced page missing requireAdvancedSeoPage";
      gaps.push({ path: rel, reason: row.notes });
      row.guardPresent = false;
    }
    if (owner === "shared-shell" && !softPresent) {
      row.notes = "WARN: shared-shell without isAdvancedSeoMutationAllowed";
    }
    rows.push(row);
  }

  const apis = walkFiles(
    path.join(root, "src/app/api/seo"),
    (name) => name === "route.ts" || name === "route.tsx",
  );
  for (const abs of apis.sort()) {
    const apiPath = fileRouteFromApi(abs);
    const rel = toPosix(path.relative(root, abs));
    const source = fs.readFileSync(abs, "utf8");
    const owner = classifyApi(apiPath);
    const needsApiGuard = owner === "advanced-seo";
    const guardPresent = API_GUARD.test(source);
    const row = {
      path: rel,
      kind: "api",
      route: apiPath,
      owner,
      guardPresent: needsApiGuard ? guardPresent : !API_GUARD.test(source),
      guardKind: needsApiGuard ? "advancedSeoApiGuardResponse" : "none-expected",
      notes: needsApiGuard && !guardPresent ? "GAP: Advanced API missing guard" : "",
    };
    if (needsApiGuard && !guardPresent) gaps.push({ path: rel, reason: row.notes });
    if (!needsApiGuard && API_GUARD.test(source)) {
      row.notes = "WARN: core-basic API has advanced guard";
      row.guardPresent = false;
    }
    rows.push(row);
  }

  for (const file of ADVANCED_ACTION_FILES) {
    const abs = path.join(root, file.path);
    if (!fs.existsSync(abs)) {
      gaps.push({ path: file.path, reason: "missing actions file" });
      continue;
    }
    const source = fs.readFileSync(abs, "utf8");
    const names =
      file.required === "all-mutations"
        ? extractExportedActions(source).filter((n) => !/^get|^list|^load/i.test(n))
        : file.required;
    for (const name of names) {
      const body = actionBody(source, name);
      const guardPresent = MUTATION_GUARD.test(body);
      const row = {
        path: file.path,
        kind: "action",
        route: name,
        owner: file.owner,
        guardPresent,
        guardKind: "assertAdvancedSeoMutationAllowed",
        notes: guardPresent ? "" : "GAP: Advanced action missing assertAdvancedSeoMutationAllowed",
      };
      if (!guardPresent) gaps.push({ path: `${file.path}#${name}`, reason: row.notes });
      rows.push(row);
    }
  }

  for (const sample of CORE_ACTION_SAMPLES) {
    const source = fs.readFileSync(path.join(root, sample.path), "utf8");
    const body = actionBody(source, sample.name);
    const hasAdvanced = MUTATION_GUARD.test(body);
    rows.push({
      path: sample.path,
      kind: "action",
      route: sample.name,
      owner: sample.owner,
      guardPresent: !hasAdvanced,
      guardKind: "none-expected",
      notes: hasAdvanced ? "GAP: core-basic action incorrectly asserts Advanced SEO" : "",
    });
    if (hasAdvanced) {
      gaps.push({
        path: `${sample.path}#${sample.name}`,
        reason: "core-basic incorrectly guarded",
      });
    }
  }

  // Bridge call sites: features/seo → modules/advanced-seo
  const bridgeFiles = [
    "src/features/seo/actions.ts",
    "src/features/seo/google-platform/actions.ts",
  ];
  for (const rel of bridgeFiles) {
    rows.push({
      path: rel,
      kind: "lib",
      route: "import:@/modules/advanced-seo/guard",
      owner: "advanced-seo",
      guardPresent: true,
      guardKind: "bridge-allowlist",
      notes: "Phase 4/7 bridge: features/seo → modules/advanced-seo (relocate deferred)",
    });
  }

  const prefixCoverage = ADVANCED_PREFIXES.map((prefix) => {
    const covered = rows.some(
      (r) =>
        r.kind === "page" &&
        (r.route === prefix || String(r.route).startsWith(`${prefix}/`)),
    );
    return { prefix, covered };
  });

  return {
    phase: "7",
    generatedAt: new Date().toISOString(),
    advancedAdminRoutes: ADVANCED_PREFIXES,
    owners: [
      "core-basic",
      "advanced-seo",
      "shared-shell",
      "search-intelligence-as-advanced",
    ],
    summary: {
      rows: rows.length,
      gaps: gaps.length,
      pages: rows.filter((r) => r.kind === "page").length,
      apis: rows.filter((r) => r.kind === "api").length,
      actions: rows.filter((r) => r.kind === "action").length,
      prefixCoverageOk: prefixCoverage.every((p) => p.covered),
    },
    prefixCoverage,
    gaps,
    rows,
  };
}

function main() {
  const write = process.argv.includes("--write");
  const json = process.argv.includes("--json");
  const inventory = buildInventory();
  if (write || !json) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, `${JSON.stringify(inventory, null, 2)}\n`);
    console.log(
      `[inventory-advanced-seo-ownership] wrote ${toPosix(path.relative(root, OUT))} gaps=${inventory.gaps.length}`,
    );
  }
  if (json) process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
  process.exit(inventory.gaps.length > 0 ? 1 : 0);
}

main();
