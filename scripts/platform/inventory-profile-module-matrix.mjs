#!/usr/bin/env node
/**
 * Phase 8 — Profile × Module compatibility matrix.
 *
 * Usage:
 *   node scripts/platform/inventory-profile-module-matrix.mjs
 *   node scripts/platform/inventory-profile-module-matrix.mjs --write
 *   node scripts/platform/inventory-profile-module-matrix.mjs --check
 *   node scripts/platform/inventory-profile-module-matrix.mjs --json
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import yaml from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROFILES_DIR = path.join(root, "docs/profiles");
const MODULES_DIR = path.join(root, "src/modules");
const OUT = path.join(root, "docs/modules-v2/inventories/profile-module-compatibility-matrix.json");

const SHIPPED_MODULE_IDS = ["documentation", "status-page", "marketing", "advanced-seo"];

function toPosix(p) {
  return p.split(path.sep).join("/");
}

/** Pull a string[] field from a ModuleManifest TS source without a TS loader. */
function readStringArrayField(src, field) {
  const re = new RegExp(`${field}:\\s*\\[([\\s\\S]*?)\\],`);
  const block = src.match(re);
  if (!block) return [];
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function readStringField(src, field) {
  const re = new RegExp(`${field}:\\s*"([^"]*)"`);
  const m = src.match(re);
  return m ? m[1] : null;
}

function loadModuleManifestFacts(moduleId) {
  const manifestPath = path.join(MODULES_DIR, moduleId, "manifest.ts");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing manifest for module ${moduleId}: ${manifestPath}`);
  }
  const src = fs.readFileSync(manifestPath, "utf8");
  return {
    id: moduleId,
    version: readStringField(src, "version") ?? "unknown",
    azuraCompatibility: readStringField(src, "azuraCompatibility") ?? "*",
    requiredPackages: readStringArrayField(src, "requiredPackages"),
    requiredCapabilities: readStringArrayField(src, "requiredCapabilities"),
    requiredPresets: readStringArrayField(src, "requiredPresets"),
    label: readStringField(src, "label") ?? moduleId,
  };
}

function moduleNotes(moduleId, profile) {
  const notes = [];
  if (moduleId === "advanced-seo") {
    notes.push(
      "Basic SEO Core routes survive Advanced SEO omit (adminRoutes never include /admin/seo root).",
    );
  }
  if (moduleId === "documentation") {
    const missingPresets = (loadModuleManifestFacts("documentation").requiredPresets || []).filter(
      (p) => !(profile.presets || []).includes(p),
    );
    if (missingPresets.length) {
      notes.push(
        `Profile omits documentation requiredPresets: ${missingPresets.join(", ")} (display/ceiling; not activate-enforced).`,
      );
    }
  }
  return notes;
}

function buildMatrix() {
  const moduleFacts = Object.fromEntries(
    SHIPPED_MODULE_IDS.map((id) => [id, loadModuleManifestFacts(id)]),
  );

  const profileFiles = fs
    .readdirSync(PROFILES_DIR)
    .filter((name) => name.endsWith(".yaml"))
    .sort();

  const profiles = [];
  for (const file of profileFiles) {
    const abs = path.join(PROFILES_DIR, file);
    const raw = fs.readFileSync(abs);
    const doc = yaml.parse(raw.toString("utf8"));
    const modules = Array.isArray(doc.modules) ? [...doc.modules] : [];
    const presets = Array.isArray(doc.presets) ? [...doc.presets] : [];
    const capabilities = Array.isArray(doc.capabilities) ? [...doc.capabilities] : [];
    const sourceHash = createHash("sha256").update(raw).digest("hex");

    const included = {};
    for (const id of SHIPPED_MODULE_IDS) {
      const facts = moduleFacts[id];
      const isIncluded = modules.includes(id);
      const missingCapabilities = isIncluded
        ? facts.requiredCapabilities.filter((c) => !capabilities.includes(c))
        : [];
      const missingPresets = isIncluded
        ? facts.requiredPresets.filter((p) => !presets.includes(p))
        : [];
      included[id] = {
        included: isIncluded,
        azuraCompatibility: facts.azuraCompatibility,
        version: facts.version,
        requiredPackages: facts.requiredPackages,
        requiredCapabilities: facts.requiredCapabilities,
        requiredPresets: facts.requiredPresets,
        missingCapabilities,
        missingPresets,
        notes: moduleNotes(id, doc),
      };
    }

    profiles.push({
      profileId: doc.id,
      label: doc.label ?? doc.id,
      source: toPosix(path.relative(root, abs)),
      profileSourceHash: sourceHash,
      modules,
      presets,
      capabilities,
      moduleMatrix: included,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    schemaVersion: 1,
    coreCompatibilityGate: "PackageManifest.azuraCompatibility vs AZURA_CORE_VERSION",
    shippedModuleIds: SHIPPED_MODULE_IDS,
    moduleFacts: Object.values(moduleFacts),
    profiles,
  };
}

function main() {
  const args = new Set(process.argv.slice(2));
  const matrix = buildMatrix();

  if (args.has("--json")) {
    process.stdout.write(`${JSON.stringify(matrix, null, 2)}\n`);
    return;
  }

  if (args.has("--check")) {
    if (!fs.existsSync(OUT)) {
      console.error(`[profile-module-matrix] missing inventory at ${toPosix(path.relative(root, OUT))}; run with --write`);
      process.exit(1);
    }
    const existing = JSON.parse(fs.readFileSync(OUT, "utf8"));
    const normalize = (doc) => {
      const clone = structuredClone(doc);
      delete clone.generatedAt;
      return clone;
    };
    const a = JSON.stringify(normalize(existing), null, 2);
    const b = JSON.stringify(normalize(matrix), null, 2);
    if (a !== b) {
      console.error("[profile-module-matrix] inventory drift — re-run with --write");
      process.exit(1);
    }
    console.log("[profile-module-matrix] ok — inventory matches profiles + manifests");
    return;
  }

  if (args.has("--write")) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, `${JSON.stringify(matrix, null, 2)}\n`);
    console.log(`[profile-module-matrix] wrote ${toPosix(path.relative(root, OUT))}`);
    return;
  }

  console.log("Profile × Module matrix (shipped Modules only)\n");
  for (const profile of matrix.profiles) {
    const on = SHIPPED_MODULE_IDS.filter((id) => profile.moduleMatrix[id].included);
    console.log(
      `${profile.profileId.padEnd(14)} modules=[${on.join(", ") || "—"}]  hash=${profile.profileSourceHash.slice(0, 12)}…`,
    );
  }
  console.log("\nUse --write to persist JSON, --check to pin against inventories.");
}

main();
