import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ASSERT_SCRIPT } from "../ensure-selected-deployment-profile.mjs";
import {
  MIDDLEWARE_MANIFEST_SCRIPT,
  PREBUILD_MIDDLEWARE_NPM,
  PREBUILD_PRISMA_METADATA_NPM,
  PREBUILD_PROFILE_NPM,
  PRISMA_METADATA_SCRIPT,
  runBuildGenerators,
  runPrebuildManifestSteps,
} from "../run-build-generators.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("runBuildGenerators (Hostinger pair)", () => {
  it("runs prisma-metadata then middleware on success", () => {
    const calls = [];
    const result = runBuildGenerators({
      env: {},
      runNode: (script) => {
        calls.push(script);
        return { status: 0 };
      },
    });
    assert.equal(result.ok, true);
    assert.deepEqual(calls, [PRISMA_METADATA_SCRIPT, MIDDLEWARE_MANIFEST_SCRIPT]);
  });

  it("aborts on prisma-metadata nonzero without calling middleware", () => {
    const calls = [];
    const result = runBuildGenerators({
      env: {},
      runNode: (script) => {
        calls.push(script);
        if (script === PRISMA_METADATA_SCRIPT) return { status: 5 };
        return { status: 0 };
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.failedStep, "prisma-metadata:generate");
    assert.equal(result.code, 5);
    assert.deepEqual(calls, [PRISMA_METADATA_SCRIPT]);
  });

  it("aborts on middleware nonzero after metadata succeeds", () => {
    const calls = [];
    const result = runBuildGenerators({
      env: {},
      runNode: (script) => {
        calls.push(script);
        if (script === MIDDLEWARE_MANIFEST_SCRIPT) return { status: 9 };
        return { status: 0 };
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.failedStep, "middleware:manifest");
    assert.equal(result.code, 9);
    assert.deepEqual(calls, [PRISMA_METADATA_SCRIPT, MIDDLEWARE_MANIFEST_SCRIPT]);
  });
});

describe("runPrebuildManifestSteps (npm triad + assert)", () => {
  it("preserves order middleware → profile → assert → prisma-metadata", () => {
    const npmCalls = [];
    const nodeCalls = [];
    const result = runPrebuildManifestSteps({
      env: {},
      runNpm: (script) => {
        npmCalls.push(script);
        return { status: 0 };
      },
      runNode: (script) => {
        nodeCalls.push(script);
        return { status: 0 };
      },
    });
    assert.equal(result.ok, true);
    assert.deepEqual(npmCalls, [
      PREBUILD_MIDDLEWARE_NPM,
      PREBUILD_PROFILE_NPM,
      PREBUILD_PRISMA_METADATA_NPM,
    ]);
    assert.deepEqual(nodeCalls, [ASSERT_SCRIPT]);
  });

  it("aborts on middleware nonzero before profile", () => {
    const npmCalls = [];
    const result = runPrebuildManifestSteps({
      env: {},
      runNpm: (script) => {
        npmCalls.push(script);
        if (script === PREBUILD_MIDDLEWARE_NPM) return { status: 2 };
        return { status: 0 };
      },
      runNode: () => ({ status: 0 }),
    });
    assert.equal(result.ok, false);
    assert.equal(result.failedStep, PREBUILD_MIDDLEWARE_NPM);
    assert.deepEqual(npmCalls, [PREBUILD_MIDDLEWARE_NPM]);
  });

  it("aborts on prisma-metadata nonzero after earlier steps succeed", () => {
    const npmCalls = [];
    const result = runPrebuildManifestSteps({
      env: {},
      runNpm: (script) => {
        npmCalls.push(script);
        if (script === PREBUILD_PRISMA_METADATA_NPM) return { status: 4 };
        return { status: 0 };
      },
      runNode: () => ({ status: 0 }),
    });
    assert.equal(result.ok, false);
    assert.equal(result.failedStep, PREBUILD_PRISMA_METADATA_NPM);
    assert.equal(result.code, 4);
    assert.deepEqual(npmCalls, [
      PREBUILD_MIDDLEWARE_NPM,
      PREBUILD_PROFILE_NPM,
      PREBUILD_PRISMA_METADATA_NPM,
    ]);
  });
});

describe("middleware hard-fail semantics (no DB)", () => {
  it("exits 0 and writes manifest with DATABASE_URL unset", () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;
    delete env.DIRECT_URL;
    delete env.POSTGRES_PRISMA_URL;
    delete env.POSTGRES_URL;
    delete env.POSTGRES_URL_NON_POOLING;

    const script = path.join(root, MIDDLEWARE_MANIFEST_SCRIPT);
    const result = spawnSync(process.execPath, [script], {
      cwd: root,
      env,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const out = path.join(root, "src/generated/middleware-manifest.json");
    assert.equal(fs.existsSync(out), true);
    const parsed = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.equal(parsed.generated, true);
  });
});

describe("entrypoint wiring (narrow)", () => {
  it("hostinger-build imports and calls runBuildGenerators", () => {
    const src = fs.readFileSync(path.join(root, "scripts/deploy/hostinger-build.mjs"), "utf8");
    assert.match(src, /import\s*\{\s*runBuildGenerators\s*\}\s*from\s*["']\.\/run-build-generators\.mjs["']/);
    assert.match(src, /runBuildGenerators\s*\(/);
    const ensureIdx = src.indexOf("ensureSelectedDeploymentProfile");
    const genIdx = src.indexOf("runBuildGenerators({");
    const standIdx = src.indexOf("OUTPUT_STANDALONE");
    assert.ok(ensureIdx > 0 && genIdx > ensureIdx && standIdx > genIdx);
  });

  it("prebuild imports and calls runPrebuildManifestSteps", () => {
    const src = fs.readFileSync(path.join(root, "scripts/deploy/prebuild.mjs"), "utf8");
    assert.match(
      src,
      /import\s*\{\s*runPrebuildManifestSteps\s*\}\s*from\s*["']\.\/run-build-generators\.mjs["']/,
    );
    assert.match(src, /runPrebuildManifestSteps\s*\(/);
    assert.doesNotMatch(src, /softFail/);
  });
});
