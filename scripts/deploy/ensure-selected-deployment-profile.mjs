#!/usr/bin/env node
/**
 * Fail-closed selected-profile gate for the Hostinger shipping build.
 *
 * Production rejects AZURA_PROFILE_FILE (override can mint a false pass via YAML id).
 * Measure twin path must call generate-deployment-profile.mjs directly — not this helper.
 *
 * Importable pure API + thin CLI. hostinger-build imports ensureSelectedDeploymentProfile.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const GENERATE_SCRIPT = "scripts/build/generate-deployment-profile.mjs";
export const ASSERT_SCRIPT = "scripts/deploy/assert-deployment-profile.mjs";

export const STANDARD_PROFILES = [
  "marketing",
  "showroom",
  "agency",
  "tourism",
  "documentation",
  "enterprise",
];

/**
 * @typedef {{ status: number, error?: string }} RunNodeResult
 * @typedef {(scriptRel: string, env: NodeJS.ProcessEnv) => RunNodeResult} RunNode
 */

/**
 * Default runner: spawn node on a repo-relative script.
 * @type {RunNode}
 */
export function defaultRunNode(scriptRel, env) {
  const abs = path.join(root, scriptRel);
  const result = spawnSync(process.execPath, [abs], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  return { status: result.status ?? 1 };
}

/**
 * @param {{ env?: NodeJS.ProcessEnv, runNode?: RunNode, log?: (msg: string) => void }} [options]
 * @returns {{ ok: true, profileId: string, yamlHash: string | null } | { ok: false, code: number, reason: string }}
 */
export function ensureSelectedDeploymentProfile(options = {}) {
  const env = { ...(options.env ?? process.env) };
  const runNode = options.runNode ?? defaultRunNode;
  const log = options.log ?? ((msg) => console.log(msg));

  if (env.AZURA_PROFILE_FILE?.trim()) {
    return {
      ok: false,
      code: 1,
      reason:
        "AZURA_PROFILE_FILE is set — rejected on the Hostinger selected-profile path. " +
        "Unset it and use AZURA_PROFILE with docs/profiles/<id>.yaml. " +
        "Matched-twin measure must call generate-deployment-profile.mjs directly (not this helper).",
    };
  }

  const resolvedProfile = (env.AZURA_PROFILE ?? "enterprise").trim().toLowerCase();
  if (!STANDARD_PROFILES.includes(resolvedProfile)) {
    return {
      ok: false,
      code: 1,
      reason:
        `Unknown AZURA_PROFILE="${resolvedProfile}". ` +
        `Expected one of: ${STANDARD_PROFILES.join(", ")}. Fix the env var — do not bypass this gate.`,
    };
  }

  const gen = runNode(GENERATE_SCRIPT, env);
  if ((gen.status ?? 1) !== 0) {
    return {
      ok: false,
      code: gen.status ?? 1,
      reason: `profile:generate failed (exit ${gen.status ?? 1})`,
    };
  }

  const assertResult = runNode(ASSERT_SCRIPT, env);
  if ((assertResult.status ?? 1) !== 0) {
    return {
      ok: false,
      code: assertResult.status ?? 1,
      reason: `profile:assert failed (exit ${assertResult.status ?? 1})`,
    };
  }

  const yamlPath = path.join(root, "docs", "profiles", `${resolvedProfile}.yaml`);
  let yamlHash = null;
  if (fs.existsSync(yamlPath)) {
    yamlHash = createHash("sha256").update(fs.readFileSync(yamlPath)).digest("hex");
    log(
      `[profile:ensure] OK — profileId=${resolvedProfile}, generated asserted, ` +
        `yamlSha256=${yamlHash.slice(0, 12)}… (hash is observability only — not a content-integrity gate)`,
    );
  } else {
    log(`[profile:ensure] OK — profileId=${resolvedProfile}, generated asserted`);
  }

  return { ok: true, profileId: resolvedProfile, yamlHash };
}

/**
 * Pre-flight: artifact looks like a standard selected profile (not twin-tainted).
 * @param {string} [artifactPath]
 */
export function isStandardDeploymentProfileArtifact(
  artifactPath = path.join(root, "src/generated/deployment-profile.json"),
) {
  if (!fs.existsSync(artifactPath)) return false;
  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    return (
      artifact.generated === true &&
      typeof artifact.profileId === "string" &&
      STANDARD_PROFILES.includes(artifact.profileId)
    );
  } catch {
    return false;
  }
}

function cliMain() {
  const result = ensureSelectedDeploymentProfile();
  if (!result.ok) {
    console.error(`[profile:ensure] ${result.reason}`);
    process.exit(result.code);
  }
  process.exit(0);
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  cliMain();
}
