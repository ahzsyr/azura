#!/usr/bin/env node
/**
 * Compile deployment profile from AZURA_PROFILE + YAML manifests.
 * Output: src/generated/deployment-profile.json (edge-safe static import).
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import yaml from "yaml";
import ts from "typescript";
import { MODULE_EXTRA_PUBLIC_BINDINGS as MODULE_EXTRA_DISABLED_PUBLIC } from "./module-extra-public-bindings.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const docsDir = path.join(root, "docs");
const outFile = path.join(root, "src", "generated", "deployment-profile.json");

const nodeRequire = createRequire(import.meta.url);
const sourceDir = path.join(root, "src");

function loadTsModule(filePath, cache = new Map()) {
  const absolutePath = path.resolve(filePath.endsWith(".ts") ? filePath : `${filePath}.ts`);
  if (cache.has(absolutePath)) return cache.get(absolutePath).exports;
  const tsModule = { exports: {} };
  cache.set(absolutePath, tsModule);
  const source = fs.readFileSync(absolutePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: absolutePath,
  }).outputText;
  const localRequire = (specifier) => {
    if (specifier.startsWith("@/")) {
      return loadTsModule(path.join(sourceDir, specifier.slice(2)), cache);
    }
    if (specifier.startsWith(".")) {
      const resolved = path.resolve(path.dirname(absolutePath), specifier);
      if (fs.existsSync(`${resolved}.ts`)) return loadTsModule(resolved, cache);
    }
    return nodeRequire(specifier);
  };
  new Function("require", "module", "exports", compiled)(localRequire, tsModule, tsModule.exports);
  return tsModule.exports;
}

const { PRESET_ROUTE_REGISTRY, PRESET_API_PREFIXES, MODULE_ROUTE_REGISTRY, getModuleManifests } = loadTsModule(
  path.join(sourceDir, "config/deployment-profile/route-registry.ts"),
);

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

function resolveProfileYamlPath(profileId) {
  const override = process.env.AZURA_PROFILE_FILE?.trim();
  if (override) {
    return path.isAbsolute(override) ? override : path.join(root, override);
  }
  return path.join(docsDir, "profiles", `${profileId}.yaml`);
}

/** Canonical module list: reject duplicates, return sorted unique. */
function canonicalizeModules(rawModules, profileId) {
  const list = (rawModules ?? []).map(String);
  const seen = new Set();
  const dups = [];
  for (const id of list) {
    if (seen.has(id)) dups.push(id);
    else seen.add(id);
  }
  if (dups.length > 0) {
    throw new Error(
      `${profileId}: duplicate module id(s) in YAML modules[]: ${[...new Set(dups)].join(", ")}`,
    );
  }
  return [...seen].sort();
}

function compileProfile(profileId, navManifest) {
  const profilePath = resolveProfileYamlPath(profileId);
  if (!fs.existsSync(profilePath)) {
    throw new Error(`Profile not found: ${profilePath}`);
  }

  const yamlBytes = fs.readFileSync(profilePath);
  const profileSourceHash = createHash("sha256").update(yamlBytes).digest("hex");
  const profile = yaml.parse(yamlBytes.toString("utf8"));
  const modules = canonicalizeModules(profile.modules, profileId);
  const enabledNavItems = collectEnabledNavIds(profile);
  const enabledModules = new Set(modules);
  for (const manifest of getModuleManifests()) {
    if (enabledModules.has(manifest.id)) {
      const missingCapabilities = manifest.requiredCapabilities.filter(
        (id) => !(profile.capabilities ?? []).includes(id),
      );
      const missingPresets = manifest.requiredPresets.filter(
        (id) => !(profile.presets ?? []).includes(id),
      );
      if (missingCapabilities.length || missingPresets.length) {
        throw new Error(
          `${profileId}: module ${manifest.id} is missing requirements: ${[
            ...missingCapabilities.map((id) => `capability:${id}`),
            ...missingPresets.map((id) => `preset:${id}`),
          ].join(", ")}`,
        );
      }
    } else {
      for (const navId of manifest.navItemIds) enabledNavItems.delete(navId);
    }
  }
  const enabledNavItemIds = [...enabledNavItems];
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
  const disabledPublicPrefixes = [];
  const disabledApiPrefixes = [];
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
  for (const [presetId, routes] of Object.entries(PRESET_ROUTE_REGISTRY)) {
    if (enabledPresets.has(presetId)) continue;
    disabledAdminPrefixes.push(...routes.adminPrefixes);
    disabledPublicSegments.push(...routes.publicSegments);
    const api = PRESET_API_PREFIXES[presetId];
    if (api) disabledApiPrefixes.push(...api);
  }

  for (const [moduleId, routes] of Object.entries(MODULE_ROUTE_REGISTRY)) {
    if (enabledModules.has(moduleId)) continue;
    disabledAdminPrefixes.push(...routes.adminPrefixes);
    disabledPublicPrefixes.push(...routes.publicPrefixes);
    disabledApiPrefixes.push(...routes.apiPrefixes);
  }

  for (const [moduleId, extras] of Object.entries(MODULE_EXTRA_DISABLED_PUBLIC)) {
    if (enabledModules.has(moduleId)) continue;
    disabledPublicPrefixes.push(...extras);
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
    modules,
    profileSourceModules: modules,
    profileSourceHash,
    enabledNavItemIds,
    enabledAdminHrefs,
    disabledAdminPrefixes: sortedDisabledAdminPrefixes,
    disabledPublicSegments: uniqueSorted(disabledPublicSegments),
    disabledPublicPrefixes: uniqueSorted(disabledPublicPrefixes),
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
    profileSourceModules: [],
    profileSourceHash: "",
    enabledNavItemIds: [],
    enabledAdminHrefs: [],
    disabledAdminPrefixes: [],
    disabledPublicSegments: [],
    disabledPublicPrefixes: [],
    disabledApiPrefixes: [],
  };
}

function resolveProfileId() {
  return (process.env.AZURA_PROFILE ?? "enterprise").trim().toLowerCase();
}

function main() {
  const resolvedId = resolveProfileId();
  if (!STANDARD_PROFILES.includes(resolvedId)) {
    console.error(
      `[profile:generate] Unknown AZURA_PROFILE="${resolvedId}". ` +
        `Expected one of: ${STANDARD_PROFILES.join(", ")}.`,
    );
    process.exit(1);
  }

  const navPath = path.join(docsDir, "admin-nav-manifest.yaml");
  if (!fs.existsSync(navPath)) {
    console.warn("[profile:generate] admin-nav-manifest.yaml missing; writing fallback (generated: false).");
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(fallbackEnterprise(), null, 2));
    process.exit(1);
  }

  const navManifest = yaml.parse(fs.readFileSync(navPath, "utf8"));
  const profileYamlPath = resolveProfileYamlPath(resolvedId);
  if (process.env.AZURA_PROFILE_FILE?.trim()) {
    console.log(`[profile:generate] AZURA_PROFILE_FILE=${profileYamlPath}`);
  }
  const compiled = compileProfile(resolvedId, navManifest);

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(compiled, null, 2));
  console.log(
    `[profile:generate] Wrote ${resolvedId} profile — ` +
      `${compiled.enabledNavItemIds.length} nav items, ` +
      `${compiled.disabledAdminPrefixes.length} disabled admin paths, ` +
      `${compiled.disabledPublicSegments.length} disabled public segments` +
      `${compiled.modules?.includes("marketing") ? " (marketing on)" : " (marketing off)"}.`,
  );
}

main();
