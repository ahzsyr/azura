/**
 * Verifies admin sidebar navigation hrefs resolve to real routes and documents drift.
 * Run: npm run admin-nav:verify
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ADMIN_APP = path.join(ROOT, "src", "app", "admin");
const ADMIN_NAV_TS = path.join(ROOT, "src", "config", "admin-nav.ts");
const NAV_MANIFEST = path.join(ROOT, "docs", "admin-nav-manifest.yaml");

/** Routes that exist but are intentionally hidden from sidebar navigation. */
const ALLOWLIST_UNLISTED_ROUTES = new Set([
  "/admin/login",
  "/admin/content/types",
  "/admin/posts/authors",
  "/admin/posts/categories",
  "/admin/posts/tags",
  "/admin/testimonials/collections",
  "/admin/seo",
  "/admin/seo/analysis",
  "/admin/seo/settings",
  "/admin/seo/templates",
  "/admin/seo/rules",
  "/admin/seo/schemas",
  "/admin/seo/reports",
  "/admin/seo/recommendations",
  "/admin/seo/monitoring",
  "/admin/seo/automation",
  "/admin/seo/assistant",
  "/admin/seo/google-tags",
  "/admin/settings",
  "/admin/presets",
  "/admin/services",
  "/admin/packages",
  "/admin/hotels",
  "/admin/services/new",
  "/admin/packages/new",
  "/admin/hotels/new",
  "/admin/catalog-products",
  "/admin/catalog-collections",
  "/admin/projects",
  "/admin/case-studies",
]);

/** Planned profile routes without pages yet. */
const PLANNED_ROUTES = new Set(["/admin/projects", "/admin/case-studies"]);

let failures = 0;
let warnings = 0;

function fail(message: string) {
  console.error(`  FAIL: ${message}`);
  failures++;
}

function warn(message: string) {
  console.warn(`  WARN: ${message}`);
  warnings++;
}

function pass(message: string) {
  console.log(`  ok: ${message}`);
}

function collectNavHrefsFromSource(): string[] {
  const source = readFileSync(ADMIN_NAV_TS, "utf8");
  const hrefs = [...source.matchAll(/href:\s*"(\/admin[^"]+)"/g)].map((match) => match[1]);
  return [...new Set(hrefs)];
}

function collectManifestHrefs(): Array<{ id: string; href: string; status?: string }> {
  const source = readFileSync(NAV_MANIFEST, "utf8");
  const items: Array<{ id: string; href: string; status?: string }> = [];
  const blocks = source.split(/\n  - id: /).slice(1);
  for (const block of blocks) {
    const id = block.split("\n")[0]?.trim();
    const hrefMatch = block.match(/href_current:\s*(\/admin\S+|null)/);
    const statusMatch = block.match(/status:\s*(\S+)/);
    const href = hrefMatch?.[1];
    if (!id || !href || href === "null") continue;
    items.push({ id, href, status: statusMatch?.[1] });
  }
  return items;
}

function collectAdminRoutes(dir: string, prefix = "/admin"): Set<string> {
  const routes = new Set<string>();
  if (!existsSync(dir)) return routes;

  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry.startsWith("(") && entry.endsWith(")")) {
        for (const route of collectAdminRoutes(fullPath, prefix)) routes.add(route);
        continue;
      }
      if (entry.startsWith("[")) {
        const parent = prefix;
        const pageFile = path.join(fullPath, "page.tsx");
        if (existsSync(pageFile)) routes.add(parent);
        for (const route of collectAdminRoutes(fullPath, parent)) routes.add(route);
        continue;
      }
      const nextPrefix = `${prefix}/${entry}`;
      const pageFile = path.join(fullPath, "page.tsx");
      if (existsSync(pageFile)) routes.add(nextPrefix);
      for (const route of collectAdminRoutes(fullPath, nextPrefix)) routes.add(route);
    }
  }

  return routes;
}

function hasDynamicContentTypeRoute(): boolean {
  return existsSync(
    path.join(ADMIN_APP, "(dashboard)", "content", "[typeSlug]", "page.tsx"),
  );
}

function routeExists(href: string, routes: Set<string>): boolean {
  if (routes.has(href)) return true;
  if (href.startsWith("/admin/content/") && hasDynamicContentTypeRoute()) {
    const segment = href.replace("/admin/content/", "").split("/")[0];
    if (segment && !segment.includes("[")) return true;
  }
  return false;
}

function main() {
  console.log("admin-nav:verify — navigation vs admin routes\n");

  const routes = collectAdminRoutes(ADMIN_APP);
  const navHrefs = collectNavHrefsFromSource();

  for (const href of navHrefs) {
    if (!routeExists(href, routes)) {
      fail(`nav href has no route: ${href}`);
    } else {
      pass(`nav href resolves: ${href}`);
    }
  }

  for (const item of collectManifestHrefs()) {
    if (item.status === "planned" || item.status === "removed") continue;
    if (!routeExists(item.href, routes)) {
      fail(`manifest ${item.id} href_current missing route: ${item.href}`);
    }
  }

  const unlisted = [...routes]
    .filter((route) => !navHrefs.some((href) => route === href || route.startsWith(`${href}/`)))
    .filter((route) => !ALLOWLIST_UNLISTED_ROUTES.has(route))
    .filter((route) => !route.includes("["))
    .sort();

  if (unlisted.length > 0) {
    warn(`admin routes not in sidebar (${unlisted.length}): ${unlisted.join(", ")}`);
  } else {
    pass("no unexpected unlisted admin routes");
  }

  for (const planned of PLANNED_ROUTES) {
    if (!routes.has(planned)) {
      warn(`planned route not implemented: ${planned}`);
    }
  }

  console.log(`\nadmin-nav:verify complete — ${failures} failure(s), ${warnings} warning(s)`);
  process.exit(failures > 0 ? 1 : 0);
}

main();
