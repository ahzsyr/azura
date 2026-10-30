#!/usr/bin/env node
/**
 * Phase 6 — profileGating evidence pack (no Hostinger twin build).
 * Pins production/twin asserts + cites CI commands for route/nav ceiling.
 *
 * Usage:
 *   node scripts/platform/profile-gating-evidence.mjs
 *   node scripts/platform/profile-gating-evidence.mjs --json
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import yaml from "yaml";
import { assertTwinDeploymentProfile } from "./assert-twin-deployment-profile.mjs";
import {
  assertDeploymentProfile,
  loadExpectations,
} from "../deploy/assert-deployment-profile.mjs";
import { sha256Text } from "./measure-profile-boundary-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(root, "docs/modules-v2/inventories/profile-gating-evidence.json");
const ENTERPRISE_YAML = path.join(root, "docs/profiles/enterprise.yaml");
const ARTIFACT = path.join(root, "src/generated/deployment-profile.json");

function runGenerate(env) {
  const result = spawnSync(
    process.execPath,
    [path.join(root, "scripts/build/generate-deployment-profile.mjs")],
    { cwd: root, env: { ...process.env, ...env }, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`generate failed: ${result.stderr || result.stdout}`);
  }
}

function main() {
  const json = process.argv.includes("--json");
  const backup = fs.existsSync(ARTIFACT) ? fs.readFileSync(ARTIFACT, "utf8") : null;
  const evidence = {
    phase: "6",
    lane: "profileGating",
    measuredAt: new Date().toISOString(),
    commands: [
      "npm run profiles:verify",
      "npm run test:profile-source-integrity",
      "node scripts/platform/profile-gating-evidence.mjs",
    ],
    releaseGate: { exclusionCiGate: false, decision: "docs-only" },
  };

  try {
    runGenerate({ AZURA_PROFILE: "enterprise" });
    const enterprise = JSON.parse(fs.readFileSync(ARTIFACT, "utf8"));
    const expectations = loadExpectations();
    const prod = assertDeploymentProfile({
      artifact: enterprise,
      resolvedProfile: "enterprise",
      expectations,
    });
    assertTwinDeploymentProfile(enterprise, { expectMarketing: true, profileId: "enterprise" });

    const enterpriseYaml = yaml.parse(fs.readFileSync(ENTERPRISE_YAML, "utf8"));
    const twinModules = (enterpriseYaml.modules ?? []).filter((m) => String(m) !== "marketing");
    const twinPath = path.join(root, "performance-reports/profile-boundary/gating-twin.yaml");
    fs.mkdirSync(path.dirname(twinPath), { recursive: true });
    fs.writeFileSync(
      twinPath,
      yaml.stringify({
        ...enterpriseYaml,
        id: "enterprise",
        label: "gating twin minus marketing",
        modules: twinModules,
      }),
    );

    runGenerate({ AZURA_PROFILE: "enterprise", AZURA_PROFILE_FILE: twinPath });
    const twin = JSON.parse(fs.readFileSync(ARTIFACT, "utf8"));
    assertTwinDeploymentProfile(twin, { expectMarketing: false, profileId: "enterprise" });

    const disabledPublic = new Set((twin.disabledPublicPrefixes ?? []).map(String));
    const disabledApi = new Set((twin.disabledApiPrefixes ?? []).map(String));
    const twinDisablesShortLink = disabledPublic.has("/a");
    const twinDisablesMarketingApi = disabledApi.has("/api/marketing");
    const twinDisablesMarketingPaths = twinDisablesShortLink && twinDisablesMarketingApi;

    evidence.ok = prod.ok === true;
    evidence.enterpriseAssertOk = prod.ok === true;
    evidence.twinExpectMarketingAbsentOk = true;
    evidence.enterpriseModulesIncludeMarketing = (enterprise.modules ?? []).includes("marketing");
    evidence.twinModulesIncludeMarketing = (twin.modules ?? []).includes("marketing");
    evidence.twinDisabledPublicIncludesMarketingBindings = twinDisablesMarketingPaths;
    evidence.twinDisabledPublicPrefixes = [...disabledPublic];
    evidence.twinDisabledApiPrefixes = [...disabledApi];
    evidence.inputs = {
      enterpriseYamlSha256: sha256Text(fs.readFileSync(ENTERPRISE_YAML, "utf8")),
    };
    evidence.notes = [
      "Profile gating answers access/nav/prefix ceiling — independent of bundleEvidence.",
      "Twin omits marketing from modules[]; production expectations assert is not applied to twin YAML.",
      twinDisablesMarketingPaths
        ? "Twin disables Marketing API (/api/marketing) and short-link (/a via MODULE_EXTRA_PUBLIC_BINDINGS)."
        : "Review twin disabledApiPrefixes / disabledPublicPrefixes for Marketing bindings.",
    ];

    if (!evidence.ok || evidence.twinModulesIncludeMarketing) {
      throw new Error("profile gating evidence failed asserts");
    }
  } catch (err) {
    evidence.ok = false;
    evidence.error = err instanceof Error ? err.message : String(err);
  } finally {
    if (backup !== null) fs.writeFileSync(ARTIFACT, backup);
    else {
      try {
        runGenerate({ AZURA_PROFILE: "enterprise" });
      } catch {
        /* leave */
      }
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(evidence, null, 2)}\n`);
  if (json) {
    process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  } else {
    console.log(`[profile-gating-evidence] ok=${evidence.ok}`);
    console.log(`[profile-gating-evidence] wrote ${path.relative(root, OUT)}`);
  }
  process.exit(evidence.ok ? 0 : 1);
}

main();
