#!/usr/bin/env node
/**
 * Assert selected deployment-profile.json matches AZURA_PROFILE, is generated,
 * and module set matches reviewed expectations (M2.2 shrink guard).
 *
 * Trust model: expectations make shrink visible/reviewable via
 * --write-expectations diffs — not impossible. profileSourceHash is provenance
 * only (not a Hostinger hard-fail).
 *
 * Expectations path: scripts/deploy/profile-source-expectations.json (ships with build scripts).
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "yaml";

export const STANDARD_PROFILES = [
  "marketing",
  "showroom",
  "agency",
  "tourism",
  "documentation",
  "enterprise",
];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const ARTIFACT_PATH = path.join(root, "src", "generated", "deployment-profile.json");
export const EXPECTATIONS_PATH = path.join(
  root,
  "scripts",
  "deploy",
  "profile-source-expectations.json",
);

/**
 * @param {{ artifact: object, resolvedProfile: string, expectations: object | null }} input
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function assertDeploymentProfile({ artifact, resolvedProfile, expectations }) {
  if (!STANDARD_PROFILES.includes(resolvedProfile)) {
    return {
      ok: false,
      reason:
        `Unknown AZURA_PROFILE="${resolvedProfile}". ` +
        `Expected one of: ${STANDARD_PROFILES.join(", ")}.`,
    };
  }

  if (artifact.generated !== true) {
    return {
      ok: false,
      reason: `deployment-profile.json generated !== true (got ${JSON.stringify(artifact.generated)}).`,
    };
  }

  if (artifact.profileId !== resolvedProfile) {
    return {
      ok: false,
      reason:
        `profileId mismatch: artifact=${JSON.stringify(artifact.profileId)} ` +
        `expected=${JSON.stringify(resolvedProfile)} (AZURA_PROFILE).`,
    };
  }

  const modules = Array.isArray(artifact.modules)
    ? [...artifact.modules].map(String).sort()
    : null;
  const sourceModules = Array.isArray(artifact.profileSourceModules)
    ? [...artifact.profileSourceModules].map(String).sort()
    : null;

  if (!sourceModules) {
    return {
      ok: false,
      reason: "missing profileSourceModules (regenerate with profile:generate).",
    };
  }

  if (!modules || JSON.stringify(modules) !== JSON.stringify(sourceModules)) {
    return {
      ok: false,
      reason:
        "modules must equal profileSourceModules (both sorted unique). Regenerate the artifact.",
    };
  }

  if (!expectations || typeof expectations !== "object") {
    return {
      ok: false,
      reason: `missing expectations object (load ${path.relative(root, EXPECTATIONS_PATH)}).`,
    };
  }

  const row = expectations.profiles?.[resolvedProfile];
  if (!row || !Array.isArray(row.modules)) {
    return {
      ok: false,
      reason:
        `No expectations.modules for profile "${resolvedProfile}". ` +
        `Acknowledge intentional changes with: node scripts/deploy/assert-deployment-profile.mjs --write-expectations`,
    };
  }

  const expected = [...row.modules].map(String).sort();
  if (JSON.stringify(sourceModules) !== JSON.stringify(expected)) {
    return {
      ok: false,
      reason:
        `profileSourceModules drift vs reviewed expectations for "${resolvedProfile}".\n` +
        `  artifact: ${JSON.stringify(sourceModules)}\n` +
        `  expected: ${JSON.stringify(expected)}\n` +
        `Trust model: shrink is reviewable via expectations diff — not impossible.\n` +
        `To acknowledge: node scripts/deploy/assert-deployment-profile.mjs --write-expectations`,
    };
  }

  return { ok: true };
}

export function loadExpectations(expectationsPath = EXPECTATIONS_PATH) {
  if (!fs.existsSync(expectationsPath)) return null;
  return JSON.parse(fs.readFileSync(expectationsPath, "utf8"));
}

export function writeExpectationsFromYaml() {
  const profiles = {};
  for (const id of STANDARD_PROFILES) {
    const yamlPath = path.join(root, "docs", "profiles", `${id}.yaml`);
    const bytes = fs.readFileSync(yamlPath);
    const doc = yaml.parse(bytes.toString("utf8"));
    const raw = (doc.modules ?? []).map(String);
    const seen = new Set();
    for (const m of raw) {
      if (seen.has(m)) {
        throw new Error(`${id}: duplicate module ${m}`);
      }
      seen.add(m);
    }
    profiles[id] = {
      modules: [...seen].sort(),
      sourceHash: createHash("sha256").update(bytes).digest("hex"),
    };
  }
  const payload = {
    description:
      "Reviewed module-set expectations per AZURA_PROFILE. Production assert compares artifact.profileSourceModules to profiles[id].modules. Updating this file is a reviewable bypass (same class as marketing-shared-edges).",
    updatedAt: new Date().toISOString(),
    profiles,
  };
  fs.writeFileSync(EXPECTATIONS_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  const mirror = path.join(root, "docs/azura-v2/inventories/profile-source-expectations.json");
  fs.mkdirSync(path.dirname(mirror), { recursive: true });
  fs.writeFileSync(mirror, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `[profile:assert] Wrote expectations → ${path.relative(root, EXPECTATIONS_PATH)} ` +
      `(mirror ${path.relative(root, mirror)})`,
  );
  return payload;
}

function cliMain() {
  const args = process.argv.slice(2);
  if (args.includes("--write-expectations")) {
    writeExpectationsFromYaml();
    process.exit(0);
  }

  const resolvedProfile = (process.env.AZURA_PROFILE ?? "enterprise").trim().toLowerCase();

  if (!fs.existsSync(ARTIFACT_PATH)) {
    console.error(`[profile:assert] Missing ${ARTIFACT_PATH}`);
    process.exit(1);
  }

  let artifact;
  try {
    artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8"));
  } catch (error) {
    console.error(`[profile:assert] Invalid JSON in ${ARTIFACT_PATH}:`, error);
    process.exit(1);
  }

  const expectations = loadExpectations();
  if (!expectations) {
    console.error(
      `[profile:assert] Missing ${path.relative(root, EXPECTATIONS_PATH)}. ` +
        `Run: node scripts/deploy/assert-deployment-profile.mjs --write-expectations`,
    );
    process.exit(1);
  }

  const result = assertDeploymentProfile({
    artifact,
    resolvedProfile,
    expectations,
  });
  if (!result.ok) {
    console.error(`[profile:assert] ${result.reason}`);
    process.exit(1);
  }

  console.log(
    `[profile:assert] OK — profileId=${artifact.profileId}, generated=true, ` +
      `modules=${JSON.stringify(artifact.profileSourceModules)}`,
  );
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  cliMain();
}
