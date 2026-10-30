#!/usr/bin/env node
/**
 * Phase 6 — E0 toolchain preflight for matched-twin boundary measure.
 * Durable Node only; rejects known ephemeral session runtimes.
 *
 * Usage:
 *   node scripts/platform/preflight-measure-toolchain.mjs
 *   node scripts/platform/preflight-measure-toolchain.mjs --json
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const requireFromRoot = createRequire(path.join(root, "package.json"));

const EPHEMERAL_PATH_FRAGMENTS = [
  "Codex/artifact-sessions",
  "codex-runtimes",
  "cua_node",
  "cursor-agent",
  "ChatGPT.app",
  "dsh-runtimes",
  "dsh-primary-runtime",
];

function isEphemeralExecPath(execPath) {
  const normalized = execPath.replace(/\\/g, "/");
  return EPHEMERAL_PATH_FRAGMENTS.some((frag) => normalized.includes(frag));
}

function existsExecutable(candidate) {
  try {
    fs.accessSync(candidate, fs.constants.X_OK);
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function listNvmNodes() {
  const base = path.join(os.homedir(), ".nvm", "versions", "node");
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const entry of fs.readdirSync(base)) {
    const candidate = path.join(base, entry, "bin", "node");
    if (existsExecutable(candidate)) out.push(candidate);
  }
  return out;
}

function listFnmNodes() {
  const base = path.join(os.homedir(), ".fnm", "node-versions");
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const entry of fs.readdirSync(base)) {
    const candidate = path.join(base, entry, "installation", "bin", "node");
    if (existsExecutable(candidate)) out.push(candidate);
  }
  return out;
}

function whichNode() {
  const result = spawnSync(process.platform === "win32" ? "where" : "which", ["node"], {
    encoding: "utf8",
  });
  if (result.status !== 0) return null;
  const line = (result.stdout || "").split(/\r?\n/).map((s) => s.trim()).find(Boolean);
  return line && existsExecutable(line) ? line : null;
}

function resolveSwcPackageName() {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "darwin" && arch === "arm64") return "@next/swc-darwin-arm64";
  if (platform === "darwin" && arch === "x64") return "@next/swc-darwin-x64";
  if (platform === "linux" && arch === "arm64") return "@next/swc-linux-arm64-gnu";
  if (platform === "linux" && arch === "x64") return "@next/swc-linux-x64-gnu";
  if (platform === "win32" && arch === "x64") return "@next/swc-win32-x64-msvc";
  return null;
}

function probeSwc(execPath) {
  const pkg = resolveSwcPackageName();
  if (!pkg) {
    return { ok: false, packageName: null, error: "unsupported-platform-arch" };
  }
  const probe = spawnSync(
    execPath,
    ["-e", `require(${JSON.stringify(pkg)}); console.log("swc-ok")`],
    { cwd: root, encoding: "utf8" },
  );
  if (probe.status === 0 && (probe.stdout || "").includes("swc-ok")) {
    return { ok: true, packageName: pkg, error: null };
  }
  const err = `${probe.stderr || probe.stdout || ""}`.trim().slice(0, 500);
  return { ok: false, packageName: pkg, error: err || `exit ${probe.status}` };
}

function nodeVersion(execPath) {
  const result = spawnSync(execPath, ["-v"], { encoding: "utf8" });
  return result.status === 0 ? (result.stdout || "").trim() : null;
}

function readNextVersion() {
  try {
    const pkg = requireFromRoot("next/package.json");
    return typeof pkg.version === "string" ? pkg.version : null;
  } catch {
    return null;
  }
}

/**
 * Enumerate and classify Node candidates for twin measure Complete path.
 */
export function preflightMeasureToolchain(options = {}) {
  const preferExecPath = options.execPath || process.execPath;
  const fixedPaths = {
    "/opt/homebrew/bin/node": existsExecutable("/opt/homebrew/bin/node")
      ? "present"
      : "missing",
    "/usr/local/bin/node": existsExecutable("/usr/local/bin/node") ? "present" : "missing",
  };

  const commandVNode = whichNode();
  const nvmVersions = listNvmNodes();
  const fnmVersions = listFnmNodes();

  const rawCandidates = [
    preferExecPath,
    commandVNode,
    "/opt/homebrew/bin/node",
    "/usr/local/bin/node",
    ...nvmVersions,
    ...fnmVersions,
  ].filter(Boolean);

  const seen = new Set();
  const candidates = [];
  for (const candidate of rawCandidates) {
    const resolved = path.resolve(candidate);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (!existsExecutable(resolved)) continue;
    const ephemeral = isEphemeralExecPath(resolved);
    const swc = probeSwc(resolved);
    candidates.push({
      execPath: resolved,
      version: nodeVersion(resolved),
      ephemeral,
      swcOk: swc.ok,
      swcPackage: swc.packageName,
      swcError: swc.error,
      usable: !ephemeral && swc.ok,
    });
  }

  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  const nextBinPresent = fs.existsSync(nextBin);
  const usable = candidates.filter((c) => c.usable);
  const selected =
    usable.find((c) => c.execPath === path.resolve(preferExecPath)) || usable[0] || null;

  const current = candidates.find((c) => c.execPath === path.resolve(preferExecPath)) || null;

  let ok = false;
  let blockReason = null;
  if (!nextBinPresent) {
    blockReason = "next-bin-missing";
  } else if (!selected) {
    blockReason = usable.length === 0 ? "no-candidate-binary" : "swc-preflight-failed";
    if (current?.ephemeral) blockReason = "ephemeral-runtime";
    else if (current && !current.swcOk) blockReason = "swc-team-id-or-load-failed";
  } else if (path.resolve(preferExecPath) !== selected.execPath) {
    // Current process is not the durable candidate — measure must be re-invoked.
    blockReason = "exec-path-not-durable";
  } else {
    ok = true;
  }

  return {
    ok,
    blockReason,
    measuredAt: new Date().toISOString(),
    platform: `${process.platform}/${process.arch}`,
    nextVersion: readNextVersion(),
    nextBinPresent,
    nextBin: nextBinPresent ? path.relative(root, nextBin) : null,
    candidateEnumeration: {
      commandVNode,
      fixedPaths,
      nvmVersions: nvmVersions.length ? nvmVersions : "absent",
      fnm: fnmVersions.length ? fnmVersions : "absent",
      usableCandidates: usable.map((c) => c.execPath),
      candidates,
    },
    selected,
    toolchain: selected
      ? {
          nodeVersion: selected.version,
          execPath: selected.execPath,
          nextVersion: readNextVersion(),
          platform: `${process.platform}/${process.arch}`,
          nextBinPresent,
          swcOk: selected.swcOk,
        }
      : {
          nodeVersion: current?.version ?? process.version,
          execPath: preferExecPath,
          nextVersion: readNextVersion(),
          platform: `${process.platform}/${process.arch}`,
          nextBinPresent,
          swcOk: Boolean(current?.swcOk),
        },
    releaseGate: { exclusionCiGate: false, decision: "docs-only" },
  };
}

function main() {
  const json = process.argv.includes("--json");
  const result = preflightMeasureToolchain();
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    console.log(`[preflight-measure-toolchain] ok=${result.ok}`);
    if (result.blockReason) console.log(`[preflight-measure-toolchain] blockReason=${result.blockReason}`);
    console.log(`[preflight-measure-toolchain] nextBinPresent=${result.nextBinPresent}`);
    console.log(
      `[preflight-measure-toolchain] usable=${result.candidateEnumeration.usableCandidates.length}`,
    );
    if (result.selected) {
      console.log(`[preflight-measure-toolchain] selected=${result.selected.execPath}`);
    }
  }
  process.exit(result.ok ? 0 : 1);
}

const isMain =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
