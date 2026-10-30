#!/usr/bin/env node
/**
 * Phase 6 matched-twin boundary measure:
 *   enterprise vs ephemeral enterprise-minus-marketing (Marketing-only delta).
 *
 * Calls generate-deployment-profile.mjs directly (may set AZURA_PROFILE_FILE for the twin).
 * Does NOT use ensureSelectedDeploymentProfile (Hostinger rejects PROFILE_FILE).
 * Strips live DATABASE_URL; restores deployment-profile.json and middleware-manifest.json
 * in finally (M2.3 Hostinger generators rewrite the tracked middleware manifest under no-DB).
 *
 * Usage:
 *   node scripts/platform/measure-profile-boundary.mjs
 *   node scripts/platform/measure-profile-boundary.mjs --skip-build
 *   node scripts/platform/measure-profile-boundary.mjs --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import yaml from "yaml";
import {
  STANDARD_PROFILES,
  isStandardDeploymentProfileArtifact,
} from "../deploy/ensure-selected-deployment-profile.mjs";
import { assertTwinDeploymentProfile } from "./assert-twin-deployment-profile.mjs";
import { preflightMeasureToolchain } from "./preflight-measure-toolchain.mjs";
import {
  PRIMARY_MARKERS,
  RELEASE_GATE,
  SECONDARY_MARKERS,
  buildBlockedSummary,
  classifyNextRel,
  decideBoundaryVerdict,
  emptyBuckets,
  sha256Text,
} from "./measure-profile-boundary-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ARTIFACT = path.join(root, "src/generated/deployment-profile.json");
const MIDDLEWARE_MANIFEST = path.join(root, "src/generated/middleware-manifest.json");
const ENTERPRISE_YAML = path.join(root, "docs/profiles/enterprise.yaml");
const EXPECTATIONS = path.join(root, "scripts/deploy/profile-source-expectations.json");
const OUT_DIR = path.join(root, "performance-reports/profile-boundary");
const TWIN_YAML = path.join(OUT_DIR, "enterprise-minus-marketing.yaml");
const SUMMARY_PATH = path.join(OUT_DIR, "summary.json");
const DOCS_SUMMARY_AZURA = path.join(root, "docs/azura-v2/inventories/profile-boundary-summary.json");
const DOCS_SUMMARY_V2 = path.join(root, "docs/modules-v2/inventories/profile-boundary-summary.json");

const args = new Set(process.argv.slice(2));
const SKIP_BUILD = args.has("--skip-build");
const DRY_RUN = args.has("--dry-run");

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function runNode(scriptRel, env, label) {
  const script = path.join(root, scriptRel);
  console.log(`[measure-profile-boundary] ${label}: node ${scriptRel}`);
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  const code = result.status ?? 1;
  if (code !== 0) {
    throw new Error(`${label} failed with exit ${code}`);
  }
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

function scanNextForMarkers(nextDir, markers) {
  const buckets = emptyBuckets();
  const files = walkFiles(nextDir);
  for (const abs of files) {
    const rel = toPosix(path.relative(root, abs));
    const bucket = classifyNextRel(rel);
    if (!bucket) continue;
    let text;
    try {
      text = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const hitMarkers = markers.filter((m) => text.includes(m));
    if (hitMarkers.length === 0) continue;
    buckets[bucket].hitCount += 1;
    if (buckets[bucket].files.length < 40) {
      buckets[bucket].files.push({ file: rel, markers: hitMarkers });
    }
  }
  return buckets;
}

function digestNextTree(nextDir) {
  if (!fs.existsSync(nextDir)) {
    return { exists: false, fileCount: 0, sha256OfPaths: null };
  }
  const files = walkFiles(nextDir)
    .map((abs) => toPosix(path.relative(root, abs)))
    .sort();
  return {
    exists: true,
    fileCount: files.length,
    sha256OfPaths: sha256Text(files.join("\n")),
  };
}

function writeTwinYaml() {
  const enterprise = yaml.parse(fs.readFileSync(ENTERPRISE_YAML, "utf8"));
  const modules = (enterprise.modules ?? []).filter((m) => String(m) !== "marketing");
  const twin = {
    ...enterprise,
    id: "enterprise",
    label: `${enterprise.label ?? "Enterprise"} (Phase 6 minus marketing)`,
    description:
      "Ephemeral matched twin for Phase 6: enterprise with only the marketing module removed from modules[]. Not a shipped profile.",
    modules,
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const text = yaml.stringify(twin);
  fs.writeFileSync(TWIN_YAML, text);
  return { twin, text };
}

function assertArtifact(_env, { expectMarketing }) {
  if (!fs.existsSync(ARTIFACT)) {
    throw new Error(`Missing ${ARTIFACT}`);
  }
  const artifact = JSON.parse(fs.readFileSync(ARTIFACT, "utf8"));
  assertTwinDeploymentProfile(artifact, { expectMarketing, profileId: "enterprise" });
  const hasMarketing = new Set((artifact.modules ?? []).map(String)).has("marketing");
  console.log(
    `[measure-profile-boundary] twin-assert OK — profileId=enterprise, marketing=${hasMarketing}`,
  );
  return artifact;
}

function buildEnvBase() {
  const env = { ...process.env };
  delete env.DATABASE_URL;
  delete env.POSTGRES_PRISMA_URL;
  delete env.POSTGRES_URL;
  delete env.POSTGRES_URL_NON_POOLING;
  env.AZURA_PROFILE = "enterprise";
  env.BUILD_WITHOUT_DB = "1";
  env.AZURA_MEASURE_NO_DB = "1";
  return env;
}

function ensureNoLiveDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    console.warn(
      "[measure-profile-boundary] DATABASE_URL is set in the parent environment; " +
        "child builds strip it. Prefer unsetting before measure to avoid accidental migrate.",
    );
  }
}

function measureOne({ label, profileFile, expectMarketing, env }) {
  const childEnv = { ...env };
  const isTwin = Boolean(profileFile);
  if (isTwin) {
    childEnv.AZURA_PROFILE_FILE = profileFile;
  } else {
    delete childEnv.AZURA_PROFILE_FILE;
  }

  runNode("scripts/build/generate-deployment-profile.mjs", childEnv, `generate:${label}`);
  let productionAssertOk = null;
  if (isTwin) {
    assertArtifact(childEnv, { expectMarketing });
  } else {
    runNode("scripts/deploy/assert-deployment-profile.mjs", childEnv, `assert:${label}`);
    productionAssertOk = true;
    assertArtifact(childEnv, { expectMarketing });
  }
  const artifactText = fs.readFileSync(ARTIFACT, "utf8");
  const artifact = JSON.parse(artifactText);

  if (!SKIP_BUILD && !DRY_RUN) {
    const buildEnv = { ...childEnv };
    delete buildEnv.AZURA_PROFILE_FILE;
    if (isTwin) {
      buildEnv.AZURA_MEASURE_SKIP_PROFILE_ENSURE = "1";
    } else {
      delete buildEnv.AZURA_MEASURE_SKIP_PROFILE_ENSURE;
    }
    runNode("scripts/deploy/hostinger-build.mjs", buildEnv, `build:${label}`);
  } else if (SKIP_BUILD) {
    console.log(`[measure-profile-boundary] --skip-build: scanning existing .next for ${label}`);
  }

  const nextDir = path.join(root, ".next");
  const primary = fs.existsSync(nextDir)
    ? scanNextForMarkers(nextDir, PRIMARY_MARKERS)
    : { ...emptyBuckets(), missingNext: true };
  const secondary = fs.existsSync(nextDir)
    ? scanNextForMarkers(nextDir, SECONDARY_MARKERS)
    : emptyBuckets();
  const buildArtifacts = digestNextTree(nextDir);

  const report = {
    label,
    measuredAt: new Date().toISOString(),
    markerMethod: "boundary-marker+substring",
    primaryMarkers: PRIMARY_MARKERS,
    secondaryMarkers: SECONDARY_MARKERS,
    expectMarketing,
    modules: artifact.modules ?? [],
    profileFile: profileFile
      ? toPosix(path.relative(root, profileFile))
      : "docs/profiles/enterprise.yaml",
    skipBuild: SKIP_BUILD || DRY_RUN,
    productionAssertOk,
    artifactSha256: sha256Text(artifactText),
    buildArtifacts,
    buckets: {
      primary: {
        clientChunks: {
          hitCount: primary.clientChunks.hitCount,
          sampleFiles: primary.clientChunks.files,
        },
        serverChunks: {
          hitCount: primary.serverChunks.hitCount,
          sampleFiles: primary.serverChunks.files,
        },
        metadata: {
          hitCount: primary.metadata.hitCount,
          sampleFiles: primary.metadata.files,
        },
      },
      secondary: {
        clientChunks: { hitCount: secondary.clientChunks.hitCount },
        serverChunks: { hitCount: secondary.serverChunks.hitCount },
        metadata: { hitCount: secondary.metadata.hitCount },
      },
    },
    disclaimer:
      "Absence of a marker means not found by this scan method — not proven exclusion. Metadata hits are not executable shipped code.",
  };

  const outPath = path.join(OUT_DIR, `${label}.json`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[measure-profile-boundary] Wrote ${toPosix(path.relative(root, outPath))}`);
  return report;
}

function restoreArtifact(backup, env) {
  if (backup !== null) {
    fs.writeFileSync(ARTIFACT, backup);
    console.log("[measure-profile-boundary] Restored previous deployment-profile.json");
    return;
  }
  const restoreEnv = { ...env };
  delete restoreEnv.AZURA_PROFILE_FILE;
  try {
    runNode("scripts/build/generate-deployment-profile.mjs", restoreEnv, "restore-generate");
  } catch (err) {
    console.error(
      "[measure-profile-boundary] restore-generate failed:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

function restoreMiddlewareManifest(backup) {
  if (backup !== null) {
    fs.writeFileSync(MIDDLEWARE_MANIFEST, backup);
    console.log("[measure-profile-boundary] Restored previous middleware-manifest.json");
    return;
  }
  console.warn(
    "[measure-profile-boundary] No prior middleware-manifest.json backup — leaving post-measure file as-is.",
  );
}

function preflightStandardArtifact(env) {
  if (isStandardDeploymentProfileArtifact(ARTIFACT)) {
    return;
  }
  console.warn(
    "[measure-profile-boundary] Pre-flight: artifact missing or not a standard selected profile — regenerating enterprise…",
  );
  const clean = { ...env };
  delete clean.AZURA_PROFILE_FILE;
  clean.AZURA_PROFILE = "enterprise";
  runNode("scripts/build/generate-deployment-profile.mjs", clean, "preflight-generate");
  if (!isStandardDeploymentProfileArtifact(ARTIFACT)) {
    throw new Error(
      `Pre-flight failed: artifact is not a standard profile (expected generated:true, profileId in ${STANDARD_PROFILES.join(", ")})`,
    );
  }
}

function writeSummaryEverywhere(summary) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`);
  fs.mkdirSync(path.dirname(DOCS_SUMMARY_V2), { recursive: true });
  fs.writeFileSync(DOCS_SUMMARY_V2, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(DOCS_SUMMARY_AZURA, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`[measure-profile-boundary] Wrote ${toPosix(path.relative(root, SUMMARY_PATH))}`);
  console.log(`[measure-profile-boundary] Wrote ${toPosix(path.relative(root, DOCS_SUMMARY_V2))}`);
  console.log(`[measure-profile-boundary] Wrote ${toPosix(path.relative(root, DOCS_SUMMARY_AZURA))}`);
}

function main() {
  ensureNoLiveDatabaseUrl();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { text: twinText } = writeTwinYaml();

  if (DRY_RUN) {
    console.log(
      `[measure-profile-boundary] --dry-run: wrote twin yaml at ${toPosix(path.relative(root, TWIN_YAML))}`,
    );
    process.exit(0);
  }

  const preflight = preflightMeasureToolchain();
  if (!preflight.ok) {
    const summary = buildBlockedSummary({
      preflight,
      error: `Toolchain preflight failed: ${preflight.blockReason}`,
    });
    summary.inputs = {
      enterpriseYamlSha256: sha256Text(fs.readFileSync(ENTERPRISE_YAML, "utf8")),
      twinYamlSha256: sha256Text(twinText),
      expectationsSha256: fs.existsSync(EXPECTATIONS)
        ? sha256Text(fs.readFileSync(EXPECTATIONS, "utf8"))
        : null,
    };
    writeSummaryEverywhere(summary);
    console.error(`[measure-profile-boundary] blocked: ${preflight.blockReason}`);
    process.exit(1);
  }

  const backup = fs.existsSync(ARTIFACT) ? fs.readFileSync(ARTIFACT, "utf8") : null;
  const middlewareBackup = fs.existsSync(MIDDLEWARE_MANIFEST)
    ? fs.readFileSync(MIDDLEWARE_MANIFEST, "utf8")
    : null;
  const env = buildEnvBase();

  let enterpriseReport;
  let twinReport;
  let exitCode = 0;
  try {
    preflightStandardArtifact(env);
    enterpriseReport = measureOne({
      label: "enterprise",
      profileFile: null,
      expectMarketing: true,
      env,
    });
    twinReport = measureOne({
      label: "enterprise-minus-marketing",
      profileFile: TWIN_YAML,
      expectMarketing: false,
      env,
    });

    const { verdict, rationale } = decideBoundaryVerdict(
      enterpriseReport.buckets.primary,
      twinReport.buckets.primary,
    );

    const summary = {
      phase: "6",
      measuredAt: new Date().toISOString(),
      pair: "enterprise vs enterprise-minus-marketing",
      status: "complete",
      verdict,
      rationale,
      toolchain: preflight.toolchain,
      inputs: {
        enterpriseYamlSha256: sha256Text(fs.readFileSync(ENTERPRISE_YAML, "utf8")),
        twinYamlSha256: sha256Text(twinText),
        expectationsSha256: fs.existsSync(EXPECTATIONS)
          ? sha256Text(fs.readFileSync(EXPECTATIONS, "utf8"))
          : null,
      },
      generatedArtifacts: {
        enterpriseDeploymentProfileSha256: enterpriseReport.artifactSha256,
        twinDeploymentProfileSha256: twinReport.artifactSha256,
        middlewareManifestNote:
          "Hostinger measure may regenerate middleware-manifest under AZURA_MEASURE_NO_DB; restored in finally.",
      },
      buildArtifacts: {
        enterprise: enterpriseReport.buildArtifacts,
        twin: twinReport.buildArtifacts,
      },
      profileGating: {
        enterpriseAssertOk: enterpriseReport.productionAssertOk === true,
        twinExpectMarketingAbsentOk: true,
        notes: [
          "Enterprise: production assert + twin assert (marketing present).",
          "Twin: twin assert (marketing absent); production expectations intentionally skipped.",
        ],
      },
      bundleEvidence: {
        markerMethod: "boundary-marker+substring",
        primaryMarkers: PRIMARY_MARKERS,
        secondaryMarkers: SECONDARY_MARKERS,
        enterpriseBuckets: enterpriseReport.buckets,
        twinBuckets: twinReport.buckets,
        deltas: {
          clientChunks:
            enterpriseReport.buckets.primary.clientChunks.hitCount -
            twinReport.buckets.primary.clientChunks.hitCount,
          serverChunks:
            enterpriseReport.buckets.primary.serverChunks.hitCount -
            twinReport.buckets.primary.serverChunks.hitCount,
          metadata:
            enterpriseReport.buckets.primary.metadata.hitCount -
            twinReport.buckets.primary.metadata.hitCount,
        },
        limitations:
          "Matched twin + no-DB Hostinger/Next + marker/substring scan cannot prove Marketing exclusion. Conclusive = marker-delta claim only. releaseGate stays docs-only.",
      },
      releaseGate: RELEASE_GATE,
      reports: {
        enterprise: toPosix(path.relative(root, path.join(OUT_DIR, "enterprise.json"))),
        twin: toPosix(
          path.relative(root, path.join(OUT_DIR, "enterprise-minus-marketing.json")),
        ),
      },
    };

    writeSummaryEverywhere(summary);
    console.log(`[measure-profile-boundary] verdict=${verdict}`);
    console.log(`[measure-profile-boundary] ${rationale}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const summary = buildBlockedSummary({
      preflight,
      error: message,
    });
    summary.verdict = "inconclusive";
    summary.status = "blocked";
    summary.blockReason = "measure-aborted";
    summary.rationale = `Measure aborted: ${message}. Incomplete evidence — abort-path inconclusive ≠ finished baseline.`;
    summary.inputs = {
      enterpriseYamlSha256: sha256Text(fs.readFileSync(ENTERPRISE_YAML, "utf8")),
      twinYamlSha256: sha256Text(twinText),
      expectationsSha256: fs.existsSync(EXPECTATIONS)
        ? sha256Text(fs.readFileSync(EXPECTATIONS, "utf8"))
        : null,
    };
    summary.reports = {
      enterprise: enterpriseReport ?? null,
      twin: twinReport ?? null,
    };
    writeSummaryEverywhere(summary);
    console.error(`[measure-profile-boundary] ${message}`);
    exitCode = 1;
  } finally {
    restoreArtifact(backup, env);
    restoreMiddlewareManifest(middlewareBackup);
  }

  process.exit(exitCode);
}

main();
