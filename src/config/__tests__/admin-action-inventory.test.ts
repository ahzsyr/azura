import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  ADMIN_ACTION_INVENTORY,
} from "@/config/admin-action-inventory";
import { ADMIN_PAGE_CONFIGS } from "@/config/admin-page-configs";
import { modeExpectsActions } from "@/config/admin-page-config";

const DASHBOARD_ROOT = path.join(
  process.cwd(),
  "src",
  "app",
  "admin",
  "(dashboard)",
);

function walkPageFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkPageFiles(full, acc);
    else if (entry.name === "page.tsx") acc.push(full.split(path.sep).join("/"));
  }
  return acc;
}

function fileToRoutePattern(filePath: string): string {
  const normalized = filePath.split(path.sep).join("/");
  const marker = "src/app/admin/(dashboard)";
  const idx = normalized.indexOf(marker);
  assert.ok(idx >= 0, `unexpected page path: ${filePath}`);
  let route = normalized.slice(idx + marker.length).replace(/\/page\.tsx$/, "");
  if (!route || route === "/") return "/admin";
  return `/admin${route}`;
}

/** Allowlisted files that may still call legacy registerPageActions during migration. */
const REGISTER_PAGE_ACTIONS_ALLOWLIST = new Set([
  "src/stores/admin-ui-store.ts",
  // Migrated away in P3 — keep empty after migration; listed temporarily for CI during rollout
]);

function findBannedRegisterPageActionsCalls(): string[] {
  const srcRoot = path.join(process.cwd(), "src");
  const hits: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "__tests__") continue;
        walk(full);
        continue;
      }
      if (!/\.(tsx|ts)$/.test(entry.name)) continue;
      const rel = full.split(path.sep).join("/").replace(/^.*?src\//, "src/");
      if (REGISTER_PAGE_ACTIONS_ALLOWLIST.has(rel)) continue;
      // Adapter layer may still reference the deprecated symbol for re-export docs
      if (rel === "src/hooks/use-admin-page-actions.ts") continue;
      const text = fs.readFileSync(full, "utf8");
      // Match call sites only, not type mentions or deprecation comments describing the name
      if (/\.registerPageActions\s*\(/.test(text) || /registerPageActions\(\s*\{/.test(text)) {
        hits.push(rel);
      }
    }
  }

  walk(srcRoot);
  return hits;
}

describe("admin action inventory — CI contract", () => {
  it("has no duplicate route patterns", () => {
    const seen = new Map<string, number>();
    for (const entry of ADMIN_ACTION_INVENTORY) {
      seen.set(entry.routePattern, (seen.get(entry.routePattern) ?? 0) + 1);
    }
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([r]) => r);
    assert.deepEqual(dupes, [], `duplicate inventory routes: ${dupes.join(", ")}`);
  });

  it("covers every /admin/(dashboard)/**/page.tsx", () => {
    const pages = walkPageFiles(DASHBOARD_ROOT);
    const inventoryRoutes = new Set(ADMIN_ACTION_INVENTORY.map((e) => e.routePattern));
    const missing: string[] = [];
    for (const file of pages) {
      const route = fileToRoutePattern(file);
      if (!inventoryRoutes.has(route)) missing.push(route);
    }
    assert.deepEqual(
      missing,
      [],
      `Unclassified admin routes (add to ADMIN_ACTION_INVENTORY):\n${missing.join("\n")}`,
    );
  });

  it("inventory routes resolve to existing page files or known dynamic patterns", () => {
    const pages = new Set(walkPageFiles(DASHBOARD_ROOT).map(fileToRoutePattern));
    const orphan = ADMIN_ACTION_INVENTORY.filter((e) => !pages.has(e.routePattern)).map(
      (e) => e.routePattern,
    );
    assert.deepEqual(orphan, [], `Inventory entries without page.tsx:\n${orphan.join("\n")}`);
  });

  it("editor/settings/utility entries with required actions must not use strategy none", () => {
    for (const entry of ADMIN_ACTION_INVENTORY) {
      assert.ok(
        entry.configKey in ADMIN_PAGE_CONFIGS,
        `${entry.routePattern}: unknown configKey ${entry.configKey}`,
      );
      const config = ADMIN_PAGE_CONFIGS[entry.configKey];
      if (!modeExpectsActions(entry.mode)) continue;
      const hasRequired = Object.values(config.expectedActions ?? {}).some(
        (e) => e === "required",
      );
      if (hasRequired) {
        assert.notEqual(
          entry.registrationStrategy,
          "none",
          `${entry.routePattern}: mode ${entry.mode} with required actions cannot use strategy "none"`,
        );
      }
    }
  });

  it("child-handoff routes document handoffScopes", () => {
    const handoffRoutes = ADMIN_ACTION_INVENTORY.filter(
      (e) => e.handoffScopes && e.handoffScopes.length > 0,
    );
    assert.ok(handoffRoutes.length >= 1, "expected at least one SEO handoff route");
    for (const entry of handoffRoutes) {
      assert.ok(
        entry.handoffScopes!.includes("seo-tab"),
        `${entry.routePattern}: expected seo-tab handoff scope`,
      );
    }
  });

  it("config mode aligns with inventory mode for actionable pages", () => {
    const mismatches: string[] = [];
    for (const entry of ADMIN_ACTION_INVENTORY) {
      if (entry.mode === "dashboard" || entry.mode === "readOnly" || entry.mode === "list") {
        continue;
      }
      const config = ADMIN_PAGE_CONFIGS[entry.configKey];
      if (config.mode !== entry.mode) {
        mismatches.push(
          `${entry.routePattern}: inventory mode=${entry.mode} config mode=${config.mode}`,
        );
      }
    }
    assert.deepEqual(mismatches, []);
  });

  it("migration guard: registerPageActions only in allowlisted adapter files", () => {
    const hits = findBannedRegisterPageActionsCalls();
    assert.deepEqual(
      hits,
      [],
      `Legacy registerPageActions() call sites must migrate to useAdminPageActions:\n${hits.join("\n")}`,
    );
  });
});

describe("admin action inventory — helpers", () => {
  it("getInventoryEntry finds known route", async () => {
    const { getInventoryEntry } = await import("@/config/admin-action-inventory");
    const entry = getInventoryEntry("/admin/pages/[id]");
    assert.ok(entry);
    assert.equal(entry!.mode, "editor");
    assert.ok(entry!.handoffScopes?.includes("seo-tab"));
  });
});
