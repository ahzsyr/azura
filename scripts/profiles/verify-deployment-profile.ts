/**
 * Deployment profile verification (Phase 7).
 * Run: npm run profiles:verify
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import yaml from "yaml";
import { MODULE_MANIFESTS } from "../../src/config/deployment-profile/route-registry";
import { BLOCK_DEFINITIONS } from "../../src/features/builder/registry/definitions";
import { isBlockRequirementMet } from "../../src/features/builder/registry/block-requirement";

const ROOT = process.cwd();
const DOCS = path.join(ROOT, "docs");
const PROFILES_DIR = path.join(DOCS, "profiles");
const NAV_MANIFEST = path.join(DOCS, "admin-nav-manifest.yaml");
const GENERATED = path.join(ROOT, "src", "generated", "deployment-profile.json");
const GENERATOR = path.join(ROOT, "scripts", "build", "generate-deployment-profile.mjs");

const STANDARD_PROFILES = [
  "marketing",
  "showroom",
  "agency",
  "tourism",
  "documentation",
  "enterprise",
] as const;

let failures = 0;

function fail(message: string) {
  console.error(`  FAIL: ${message}`);
  failures++;
}

function pass(message: string) {
  console.log(`  ok: ${message}`);
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isAdminRouteBlocked(
  pathname: string,
  disabledPrefixes: string[],
): boolean {
  return disabledPrefixes.some((prefix) => matchesPrefix(pathname, prefix));
}

function collectEnabledNavIds(profile: Record<string, unknown>): Set<string> {
  const ids = new Set<string>();
  const admin = profile.admin as { items?: Record<string, string[]> } | undefined;
  for (const list of Object.values(admin?.items ?? {})) {
    if (!Array.isArray(list)) continue;
    for (const id of list) ids.add(String(id));
  }
  return ids;
}

function compileProfile(profileId: string) {
  const env = { ...process.env, AZURA_PROFILE: profileId };
  const result = spawnSync("node", [GENERATOR], { env, encoding: "utf8" });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`profile:generate failed for ${profileId}: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(readFileSync(GENERATED, "utf8")) as {
    profileId: string;
    presets: string[];
    modules: string[];
    capabilities: string[];
    enabledNavItemIds: string[];
    disabledAdminPrefixes: string[];
    disabledPublicSegments: string[];
    disabledPublicPrefixes: string[];
    disabledApiPrefixes: string[];
  };
}

function main() {
  console.log("profiles:verify — deployment profile manifests\n");

  if (!existsSync(NAV_MANIFEST)) {
    fail("admin-nav-manifest.yaml missing");
    process.exit(1);
  }

  const navManifest = yaml.parse(readFileSync(NAV_MANIFEST, "utf8")) as {
    items?: Array<{ id?: string }>;
  };
  const manifestIds = new Set(
    (navManifest.items ?? []).map((item) => item.id).filter((id): id is string => Boolean(id)),
  );

  try {
  for (const profileId of STANDARD_PROFILES) {
    const profilePath = path.join(PROFILES_DIR, `${profileId}.yaml`);
    if (!existsSync(profilePath)) {
      fail(`missing profile YAML: ${profileId}`);
      continue;
    }

    const profile = yaml.parse(readFileSync(profilePath, "utf8")) as Record<string, unknown>;
    const enabledIds = collectEnabledNavIds(profile);
    for (const id of enabledIds) {
      if (!manifestIds.has(id)) {
        fail(`${profileId}: unknown nav item id "${id}"`);
      }
    }

    try {
      const compiled = compileProfile(profileId);
      if (compiled.profileId !== profileId) {
        fail(`${profileId}: compiled profileId mismatch (${compiled.profileId})`);
      } else {
        pass(`${profileId} generates (${compiled.enabledNavItemIds.length} nav items)`);
        const enabledModules = new Set((profile.modules as string[] | undefined) ?? []);
        for (const manifest of MODULE_MANIFESTS) {
          const disabled = !enabledModules.has(manifest.id);
          const expectPresence = (items: string[], route: string, label: string) => {
            if (items.includes(route) !== disabled) {
              fail(`${profileId}: ${label} ${route} ${disabled ? "must be disabled" : "must be enabled"}`);
            }
          };
          for (const route of manifest.adminRoutes) {
            expectPresence(compiled.disabledAdminPrefixes, route, `${manifest.id} admin route`);
          }
          for (const route of manifest.publicRoutes) {
            const isApi = route.startsWith("/api/");
            expectPresence(
              isApi ? compiled.disabledApiPrefixes : compiled.disabledPublicPrefixes,
              route,
              `${manifest.id} ${isApi ? "API" : "public route"}`,
            );
          }
          for (const navId of manifest.navItemIds) {
            if (compiled.enabledNavItemIds.includes(navId) === disabled) {
              fail(`${profileId}: ${manifest.id} nav item ${navId} has incorrect profile visibility`);
            }
          }
        }
      }
    } catch (error) {
      fail(`${profileId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log("\nMarketing exit criteria:");
  const marketing = compileProfile("marketing");
  if (marketing.enabledNavItemIds.includes("products")) {
    fail("marketing: products nav id should not be enabled");
  } else {
    pass("marketing: products nav id disabled");
  }
  if (marketing.presets.includes("product")) {
    fail("marketing: product preset should not be enabled");
  } else {
    pass("marketing: product preset disabled");
  }
  if (!marketing.disabledAdminPrefixes.includes("/admin/products")) {
    fail("marketing: /admin/products should be in disabledAdminPrefixes");
  } else {
    pass("marketing: /admin/products disabled");
  }
  if (!marketing.disabledAdminPrefixes.includes("/admin/marketing")) {
    fail("marketing: /admin/marketing should return 404 when Marketing is omitted");
  } else {
    pass("marketing: /admin/marketing disabled (middleware returns 404)");
  }
  if (!marketing.disabledPublicSegments.includes("products")) {
    fail("marketing: products public segment should be disabled");
  } else {
    pass("marketing: products public segment disabled");
  }
  if (!marketing.disabledApiPrefixes.includes("/api/products")) {
    fail("marketing: /api/products should be disabled");
  } else {
    pass("marketing: /api/products disabled");
  }
  for (const manifestPath of [
    "src/modules/marketing/manifest.ts",
    "src/modules/documentation/manifest.ts",
    "src/modules/status-page/manifest.ts",
  ]) {
    if (!existsSync(path.join(ROOT, manifestPath))) {
      fail(`source retention: ${manifestPath} must remain after profile compilation`);
    } else {
      pass(`source retention: ${manifestPath} remains in the repository`);
    }
  }

  // Restore default enterprise artifact for dev/typecheck
  compileProfile("enterprise");
  pass("restored enterprise deployment-profile.json");

  console.log("\nEnterprise content route exit criteria:");
  const enterprise = JSON.parse(readFileSync(GENERATED, "utf8")) as {
    enabledNavItemIds: string[];
    disabledAdminPrefixes: string[];
  };
  const enterpriseContentRoutes = [
    "/admin/content",
    "/admin/content/catalog-items",
    "/admin/content/listings",
    "/admin/content/offerings",
  ];
  for (const route of enterpriseContentRoutes) {
    if (isAdminRouteBlocked(route, enterprise.disabledAdminPrefixes)) {
      fail(`enterprise: ${route} must not be blocked by disabledAdminPrefixes`);
    } else {
      pass(`enterprise: ${route} reachable`);
    }
  }
  for (const navId of ["packages", "properties", "services", "content-types"]) {
    if (!enterprise.enabledNavItemIds.includes(navId)) {
      fail(`enterprise: nav item "${navId}" should be enabled`);
    } else {
      pass(`enterprise: nav item "${navId}" enabled`);
    }
  }

  console.log("\nTourism content route exit criteria:");
  const tourism = compileProfile("tourism");
  for (const route of [
    "/admin/content/catalog-items",
    "/admin/content/listings",
    "/admin/content/offerings",
  ]) {
    if (isAdminRouteBlocked(route, tourism.disabledAdminPrefixes)) {
      fail(`tourism: ${route} must not be blocked`);
    } else {
      pass(`tourism: ${route} reachable`);
    }
  }
  console.log("\nModule and block requirement contract:");
  {
    const marketingProfile = compileProfile("marketing");
    const commerceBlocks = BLOCK_DEFINITIONS.filter((definition) => definition.category === "commerce");
    if (commerceBlocks.length !== 13) {
      fail(`expected 13 commerce blocks, found ${commerceBlocks.length}`);
    } else if (commerceBlocks.some((definition) => isBlockRequirementMet(definition.requires, marketingProfile))) {
      fail("marketing: commerce blocks must be disabled without the product preset");
    } else {
      pass("marketing: all 13 commerce blocks are disabled");
    }
    const searchBlock = BLOCK_DEFINITIONS.find((definition) => definition.type === "searchBlock");
    if (!searchBlock || isBlockRequirementMet(searchBlock.requires, marketingProfile)) {
      fail("marketing: searchBlock must be disabled without the search capability");
    } else {
      pass("marketing: searchBlock is disabled");
    }
    for (const blockType of ["documentationNav", "statusDashboard"] as const) {
      const definition = BLOCK_DEFINITIONS.find((entry) => entry.type === blockType);
      if (!definition?.requires?.module || isBlockRequirementMet(definition.requires, marketingProfile)) {
        fail(`marketing: ${blockType} must be disabled when its module is omitted`);
      } else {
        pass(`marketing: ${blockType} is disabled`);
      }
    }
  }
  } finally {
    compileProfile("enterprise");
    pass("restored enterprise deployment-profile.json");
  }

  console.log(`\nprofiles:verify complete — ${failures} failure(s)`);
  process.exit(failures > 0 ? 1 : 0);
}

main();
