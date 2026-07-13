#!/usr/bin/env node
/**
 * Compile deployment profile from AZURA_PROFILE + YAML manifests.
 * Output: src/generated/deployment-profile.json (edge-safe static import).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const docsDir = path.join(root, "docs");
const outFile = path.join(root, "src", "generated", "deployment-profile.json");

const PRESET_ROUTE_REGISTRY = {
  product: {
    adminPrefixes: ["/admin/products", "/admin/collections", "/admin/catalog-taxonomy"],
    publicSegments: ["products", "collections", "compare", "brands", "tags"],
  },
  service: {
    adminPrefixes: ["/admin/content/offerings"],
    publicSegments: ["services"],
  },
  destination: {
    adminPrefixes: ["/admin/content/catalog-items"],
    publicSegments: ["packages"],
  },
  property: {
    adminPrefixes: ["/admin/content/listings"],
    publicSegments: [],
  },
  project: {
    adminPrefixes: ["/admin/content/projects"],
    publicSegments: [],
  },
  "case-study": {
    adminPrefixes: ["/admin/content/case-studies"],
    publicSegments: [],
  },
  "team-member": {
    adminPrefixes: ["/admin/team"],
    publicSegments: ["team"],
  },
  partner: {
    adminPrefixes: ["/admin/partners"],
    publicSegments: ["partners"],
  },
  knowledge: {
    adminPrefixes: ["/admin/knowledge-base"],
    publicSegments: [],
  },
  pricing: {
    adminPrefixes: ["/admin/pricing-plans", "/admin/pricing-calculators"],
    publicSegments: [],
  },
  release: {
    adminPrefixes: ["/admin/releases"],
    publicSegments: [],
  },
};

const MODULE_ROUTE_REGISTRY = {
  documentation: { adminPrefixes: ["/admin/documentation"] },
  "status-page": { adminPrefixes: ["/admin/status"] },
};

const PRESET_API_PREFIXES = {
  product: ["/api/products", "/api/collections", "/api/sync-collections"],
};

const STANDARD_PROFILES = [
  "marketing",
  "showroom",
  "agency",
  "tourism",
  "documentation",
  "enterprise",
];

function collectEnabledNavIds(profile) {
  const ids = new Set();
  const admin = profile.admin ?? {};
  const items = admin.items ?? {};
  for (const idsList of Object.values(items)) {
    if (!Array.isArray(idsList)) continue;
    for (const id of idsList) ids.add(String(id));
  }
  return ids;
}

function resolveHref(item) {
  const href = item.href_current ?? item.href_target;
  return typeof href === "string" && href.length > 0 ? href : null;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function matchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Legacy manifest rows must not disable routes still used by active nav items. */
function isLegacyNavManifestItem(item) {
  const status = item.status;
  if (status === "removed" || status === "redirected") return true;
  const profiles = item.profiles;
  if (Array.isArray(profiles) && profiles.length === 0) return true;
  return false;
}

function pruneDisabledPrefixesBlockingEnabledHrefs(disabledPrefixes, enabledHrefs) {
  return disabledPrefixes.filter(
    (prefix) => !enabledHrefs.some((href) => matchesPrefix(href, prefix)),
  );
}

function compileProfile(profileId, navManifest) {
  const profilePath = path.join(docsDir, "profiles", `${profileId}.yaml`);
  if (!fs.existsSync(profilePath)) {
    throw new Error(`Profile not found: ${profilePath}`);
  }

  const profile = yaml.parse(fs.readFileSync(profilePath, "utf8"));
  const enabledNavItemIds = [...collectEnabledNavIds(profile)];
  const enabledSet = new Set(enabledNavItemIds);

  const navItems = (navManifest.items ?? []).filter((item) => item.id && item.group);
  const idToHref = new Map();
  for (const item of navItems) {
    const href = resolveHref(item);
    if (href) idToHref.set(item.id, href);
  }

  const enabledAdminHrefs = uniqueSorted(
    enabledNavItemIds.map((id) => idToHref.get(id)).filter(Boolean),
  );

  const disabledAdminPrefixes = [];
  for (const item of navItems) {
    if (isLegacyNavManifestItem(item)) continue;
    const href = resolveHref(item);
    if (!href) continue;
    if (!enabledSet.has(item.id)) {
      disabledAdminPrefixes.push(href);
    }
  }

  const enabledPresets = new Set((profile.presets ?? []).map(String));
  const disabledPublicSegments = [];
  const disabledApiPrefixes = [];

  for (const [presetId, routes] of Object.entries(PRESET_ROUTE_REGISTRY)) {
    if (enabledPresets.has(presetId)) continue;
    disabledAdminPrefixes.push(...routes.adminPrefixes);
    disabledPublicSegments.push(...routes.publicSegments);
    const api = PRESET_API_PREFIXES[presetId];
    if (api) disabledApiPrefixes.push(...api);
  }

  const enabledModules = new Set((profile.modules ?? []).map(String));
  for (const [moduleId, routes] of Object.entries(MODULE_ROUTE_REGISTRY)) {
    if (enabledModules.has(moduleId)) continue;
    disabledAdminPrefixes.push(...routes.adminPrefixes);
  }

  const sortedDisabledAdminPrefixes = uniqueSorted(
    pruneDisabledPrefixesBlockingEnabledHrefs(disabledAdminPrefixes, enabledAdminHrefs),
  );

  return {
    generated: true,
    profileId: profile.id ?? profileId,
    label: profile.label ?? profileId,
    description: profile.description ?? "",
    core: profile.core ?? [],
    capabilities: profile.capabilities ?? [],
    experience: profile.experience ?? [],
    presets: profile.presets ?? [],
    modules: profile.modules ?? [],
    enabledNavItemIds,
    enabledAdminHrefs,
    disabledAdminPrefixes: sortedDisabledAdminPrefixes,
    disabledPublicSegments: uniqueSorted(disabledPublicSegments),
    disabledApiPrefixes: uniqueSorted(disabledApiPrefixes),
  };
}

function fallbackEnterprise() {
  return {
    generated: false,
    profileId: "enterprise",
    label: "Enterprise",
    description: "Fallback — run profile:generate to compile from YAML.",
    core: [],
    capabilities: [],
    experience: [],
    presets: [],
    modules: [],
    enabledNavItemIds: [],
    enabledAdminHrefs: [],
    disabledAdminPrefixes: [],
    disabledPublicSegments: [],
    disabledApiPrefixes: [],
  };
}

function main() {
  const profileId = (process.env.AZURA_PROFILE ?? "enterprise").trim().toLowerCase();
  if (!STANDARD_PROFILES.includes(profileId)) {
    console.warn(`[profile:generate] Unknown AZURA_PROFILE="${profileId}", using enterprise.`);
  }
  const resolvedId = STANDARD_PROFILES.includes(profileId) ? profileId : "enterprise";

  const navPath = path.join(docsDir, "admin-nav-manifest.yaml");
  if (!fs.existsSync(navPath)) {
    console.warn("[profile:generate] admin-nav-manifest.yaml missing; writing fallback.");
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(fallbackEnterprise(), null, 2));
    return;
  }

  const navManifest = yaml.parse(fs.readFileSync(navPath, "utf8"));
  const compiled = compileProfile(resolvedId, navManifest);

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(compiled, null, 2));
  console.log(
    `[profile:generate] Wrote ${resolvedId} profile — ` +
      `${compiled.enabledNavItemIds.length} nav items, ` +
      `${compiled.disabledAdminPrefixes.length} disabled admin paths, ` +
      `${compiled.disabledPublicSegments.length} disabled public segments.`,
  );
}

main();
