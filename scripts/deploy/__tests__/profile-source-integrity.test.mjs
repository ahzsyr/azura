import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  assertDeploymentProfile,
  EXPECTATIONS_PATH,
  loadExpectations,
} from "../assert-deployment-profile.mjs";
import { ensureSelectedDeploymentProfile } from "../ensure-selected-deployment-profile.mjs";
import { assertTwinDeploymentProfile } from "../../platform/assert-twin-deployment-profile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readHostingerBuildSource() {
  return fs.readFileSync(path.join(root, "scripts/deploy/hostinger-build.mjs"), "utf8");
}

describe("profile source integrity (M2.2)", () => {
  it("reachability: hostinger-build does not reference twin assert helper", () => {
    const src = readHostingerBuildSource();
    assert.equal(src.includes("assert-twin-deployment-profile"), false);
    assert.equal(src.includes("assertTwinDeploymentProfile"), false);
    assert.equal(src.includes("scripts/platform/assert-twin"), false);
  });

  it("ordinary enterprise artifact passes production assert against expectations", () => {
    const expectations = loadExpectations();
    assert.ok(expectations, `missing ${EXPECTATIONS_PATH}`);
    const artifact = JSON.parse(
      fs.readFileSync(path.join(root, "src/generated/deployment-profile.json"), "utf8"),
    );
    // May be any profile — regenerate enterprise for this pin
    const gen = spawnSync(
      process.execPath,
      [path.join(root, "scripts/build/generate-deployment-profile.mjs")],
      { cwd: root, env: { ...process.env, AZURA_PROFILE: "enterprise" }, encoding: "utf8" },
    );
    assert.equal(gen.status, 0, gen.stderr);
    const enterprise = JSON.parse(
      fs.readFileSync(path.join(root, "src/generated/deployment-profile.json"), "utf8"),
    );
    const result = assertDeploymentProfile({
      artifact: enterprise,
      resolvedProfile: "enterprise",
      expectations,
    });
    assert.equal(result.ok, true, result.ok ? "" : result.reason);
    assert.ok(enterprise.profileSourceModules.includes("marketing"));
  });

  it("twin YAML minus marketing fails production expectations but passes twin assert", () => {
    const expectations = loadExpectations();
    const twinPath = path.join(root, "performance-reports/profile-boundary/m22-twin-test.yaml");
    fs.mkdirSync(path.dirname(twinPath), { recursive: true });
    const enterpriseYaml = fs.readFileSync(
      path.join(root, "docs/profiles/enterprise.yaml"),
      "utf8",
    );
    // Strip marketing from modules list while keeping id: enterprise
    const twinYaml = enterpriseYaml.replace(/^\s*-\s*marketing\s*$/m, "");
    fs.writeFileSync(twinPath, twinYaml);

    const gen = spawnSync(
      process.execPath,
      [path.join(root, "scripts/build/generate-deployment-profile.mjs")],
      {
        cwd: root,
        env: {
          ...process.env,
          AZURA_PROFILE: "enterprise",
          AZURA_PROFILE_FILE: twinPath,
        },
        encoding: "utf8",
      },
    );
    assert.equal(gen.status, 0, gen.stderr);
    const twinArtifact = JSON.parse(
      fs.readFileSync(path.join(root, "src/generated/deployment-profile.json"), "utf8"),
    );

    const prod = assertDeploymentProfile({
      artifact: twinArtifact,
      resolvedProfile: "enterprise",
      expectations,
    });
    assert.equal(prod.ok, false, "production assert must fail expectations on shrink");
    assert.match(prod.reason, /drift vs reviewed expectations/);

    assert.doesNotThrow(() =>
      assertTwinDeploymentProfile(twinArtifact, { expectMarketing: false }),
    );

    // Restore standard enterprise for other tests / tree hygiene
    spawnSync(process.execPath, [path.join(root, "scripts/build/generate-deployment-profile.mjs")], {
      cwd: root,
      env: { ...process.env, AZURA_PROFILE: "enterprise" },
    });
  });

  it("ensure rejects PROFILE_FILE with zero runner calls", () => {
    const calls = [];
    const result = ensureSelectedDeploymentProfile({
      env: {
        AZURA_PROFILE: "enterprise",
        AZURA_PROFILE_FILE: "docs/profiles/enterprise.yaml",
      },
      runNode: (script) => {
        calls.push(script);
        return { status: 0 };
      },
      log: () => {},
    });
    assert.equal(result.ok, false);
    assert.equal(calls.length, 0);
  });
});
