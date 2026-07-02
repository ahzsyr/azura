/**
 * Deployment profile verification (Phase 7).
 * Run: npm run profiles:verify
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import yaml from "yaml";

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

function collectEnabledNavIds(profile: Record<string, unknown>): Set<string> {
  const ids = new Set<string>();
  const admin = profile.admin as { items?: Record<string, string[]> } | undefined;
  for (const list of Object.values(admin?.items ?? {})) {
    if (!Array.isArray(list)) continue;
    for (const id of list) ids.add(String(id));
  }
  return ids;
}

function compileProfile(profileId: string, navManifest: Record<string, unknown>) {
  const env = { ...process.env, AZURA_PROFILE: profileId };
  const result = spawnSync("node", [GENERATOR], { env, encoding: "utf8" });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`profile:generate failed for ${profileId}: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(readFileSync(GENERATED, "utf8")) as {
    profileId: string;
    presets: string[];
    enabledNavItemIds: string[];
    disabledAdminPrefixes: string[];
    disabledPublicSegments: string[];
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
      const compiled = compileProfile(profileId, navManifest);
      if (compiled.profileId !== profileId) {
        fail(`${profileId}: compiled profileId mismatch (${compiled.profileId})`);
      } else {
        pass(`${profileId} generates (${compiled.enabledNavItemIds.length} nav items)`);
      }
    } catch (error) {
      fail(`${profileId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log("\nMarketing exit criteria:");
  const marketing = compileProfile("marketing", navManifest);
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

  // Restore default enterprise artifact for dev/typecheck
  compileProfile("enterprise", navManifest);
  pass("restored enterprise deployment-profile.json");

  console.log(`\nprofiles:verify complete — ${failures} failure(s)`);
  process.exit(failures > 0 ? 1 : 0);
}

main();
