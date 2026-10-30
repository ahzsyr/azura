#!/usr/bin/env node
/**
 * Inventory static imports into @/modules/marketing/** from outside that tree.
 * CI: compare discovery to a reviewed snapshot (add/remove/symbol-change → fail).
 *
 * Usage:
 *   node scripts/platform/inventory-shared-module-edges.mjs
 *   node scripts/platform/inventory-shared-module-edges.mjs --write-snapshot docs/azura-v2/inventories/marketing-shared-edges.json
 *   node scripts/platform/inventory-shared-module-edges.mjs --json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = path.join(root, "src");
const MARKETING_ROOT = path.join(SRC, "modules", "marketing");
const DEFAULT_SNAPSHOT = path.join(
  root,
  "docs/azura-v2/inventories/marketing-shared-edges.json",
);

const WRITE_FLAG = "--write-snapshot";
const JSON_FLAG = "--json";

const IMPORT_RE =
  /(?:^|[^\w$])(?:import|export)\s+(?:type\s+)?(?:([\s\S]*?)\s+from\s+)?["']([^"']+)["']/gm;

function walkTsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTsFiles(full, out);
    else if (/\.(ts|tsx|mts|cts)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function relFromRoot(abs) {
  return toPosix(path.relative(root, abs));
}

function isTestPath(relPosix) {
  return (
    relPosix.includes("/__tests__/") ||
    /\.(test|spec)\.(ts|tsx|mts|cts)$/.test(relPosix) ||
    relPosix.includes("/test/") ||
    relPosix.includes("/tests/")
  );
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function parseImportedSymbols(clause) {
  if (!clause || !clause.trim()) return ["*side-effect*"];
  const text = clause.replace(/\btype\s+/g, "").trim();

  if (text.startsWith("*")) {
    const m = text.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
    return [m ? `* as ${m[1]}` : "*"];
  }

  const symbols = [];
  const defaultMatch = text.match(/^([A-Za-z_$][\w$]*)\s*(?:,|$)/);
  if (defaultMatch && !text.startsWith("{")) {
    symbols.push(`default as ${defaultMatch[1]}`);
  }

  const brace = text.match(/\{([^}]*)\}/);
  if (brace) {
    for (const part of brace[1].split(",")) {
      const raw = part.trim();
      if (!raw) continue;
      const asMatch = raw.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
      if (asMatch) symbols.push(`${asMatch[1]} as ${asMatch[2]}`);
      else {
        const name = raw.match(/^([A-Za-z_$][\w$]*)$/);
        if (name) symbols.push(name[1]);
      }
    }
  }

  if (symbols.length === 0) return ["*unknown*"];
  return [...new Set(symbols)].sort();
}

function resolveSpecifier(importerAbs, specifier) {
  if (specifier.startsWith("@/")) {
    return path.join(SRC, specifier.slice(2));
  }
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    return path.resolve(path.dirname(importerAbs), specifier);
  }
  return null;
}

function normalizeModulePath(resolvedAbs) {
  let base = resolvedAbs;
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      base = c;
      break;
    }
  }
  return toPosix(path.relative(root, base));
}

function isUnderMarketing(absPath) {
  const rel = path.relative(MARKETING_ROOT, absPath);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function discoverEdges() {
  const files = walkTsFiles(SRC);
  const edges = [];

  for (const file of files) {
    if (isUnderMarketing(file)) continue;
    const importer = relFromRoot(file);
    const source = stripComments(fs.readFileSync(file, "utf8"));
    IMPORT_RE.lastIndex = 0;
    let match;
    while ((match = IMPORT_RE.exec(source))) {
      const clause = match[1];
      const specifier = match[2];
      if (!specifier) continue;
      // skip type-only of non-marketing quickly via resolve
      const resolved = resolveSpecifier(file, specifier);
      if (!resolved) continue;
      if (!isUnderMarketing(resolved) && !specifier.includes("modules/marketing")) {
        // resolve may point at file without extension yet
        const asMarketingAlias =
          specifier.startsWith("@/modules/marketing/") ||
          specifier === "@/modules/marketing";
        if (!asMarketingAlias) {
          // relative path into marketing
          const normTry = normalizeModulePath(resolved);
          if (!normTry.startsWith("src/modules/marketing/")) continue;
        }
      }

      const modulePath = specifier.startsWith("@/")
        ? specifier.replace(/^@\//, "src/")
        : normalizeModulePath(resolved);

      const modulePathNorm = modulePath.startsWith("src/modules/marketing")
        ? modulePath.replace(/\.(ts|tsx|mts|cts)$/, "")
        : (() => {
            const n = normalizeModulePath(resolved).replace(/\.(ts|tsx|mts|cts)$/, "");
            return n;
          })();

      if (!modulePathNorm.startsWith("src/modules/marketing")) continue;

      const importedSymbols = parseImportedSymbols(clause ?? "");
      edges.push({
        importer,
        modulePath: modulePathNorm,
        importedSymbols,
        kind: isTestPath(importer) ? "test" : "production",
      });
    }
  }

  return dedupeEdges(edges);
}

function edgeKey(e) {
  return `${e.kind}|${e.importer}|${e.modulePath}|${e.importedSymbols.join(",")}`;
}

function dedupeEdges(edges) {
  const map = new Map();
  for (const e of edges) {
    map.set(edgeKey(e), {
      importer: e.importer,
      modulePath: e.modulePath,
      importedSymbols: [...e.importedSymbols].sort(),
      kind: e.kind,
    });
  }
  return [...map.values()].sort((a, b) => edgeKey(a).localeCompare(edgeKey(b)));
}

function snapshotPayload(edges) {
  return {
    module: "marketing",
    description:
      "Reviewed production (+ test) static import edges into src/modules/marketing from outside that tree. Edge identity = kind + importer + modulePath + sorted importedSymbols.",
    generatedAt: new Date().toISOString(),
    edges,
  };
}

function loadSnapshot(snapshotPath) {
  if (!fs.existsSync(snapshotPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
}

function diffSnapshots(discovered, expected) {
  const discKeys = new Map(discovered.map((e) => [edgeKey(e), e]));
  const expKeys = new Map((expected?.edges ?? []).map((e) => [edgeKey(e), e]));
  const added = [];
  const removed = [];
  for (const [k, e] of discKeys) {
    if (!expKeys.has(k)) added.push(e);
  }
  for (const [k, e] of expKeys) {
    if (!discKeys.has(k)) removed.push(e);
  }
  return { added, removed };
}

function printResnapshotHelp(snapshotPath) {
  const rel = toPosix(path.relative(root, snapshotPath));
  console.error("");
  console.error("To acknowledge inventory changes, re-snapshot and update accepted-coupling docs:");
  console.error(
    `  node scripts/platform/inventory-shared-module-edges.mjs --write-snapshot ${rel}`,
  );
  console.error("");
}

function parseArgs(argv) {
  let writeSnapshot = null;
  let asJson = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === WRITE_FLAG) {
      writeSnapshot = argv[i + 1]
        ? path.resolve(root, argv[i + 1])
        : DEFAULT_SNAPSHOT;
      i++;
    } else if (argv[i] === JSON_FLAG) {
      asJson = true;
    }
  }
  return { writeSnapshot, asJson };
}

function main() {
  const { writeSnapshot, asJson } = parseArgs(process.argv.slice(2));
  const edges = discoverEdges();
  const production = edges.filter((e) => e.kind === "production");
  const test = edges.filter((e) => e.kind === "test");

  if (writeSnapshot) {
    fs.mkdirSync(path.dirname(writeSnapshot), { recursive: true });
    const payload = snapshotPayload(edges);
    fs.writeFileSync(writeSnapshot, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(
      `[inventory-shared-module-edges] Wrote snapshot ${toPosix(path.relative(root, writeSnapshot))} ` +
        `(${production.length} production, ${test.length} test).`,
    );
    process.exit(0);
  }

  const snapshotPath = DEFAULT_SNAPSHOT;
  const expected = loadSnapshot(snapshotPath);

  if (asJson) {
    console.log(JSON.stringify(snapshotPayload(edges), null, 2));
  }

  if (!expected) {
    console.error(
      `[inventory-shared-module-edges] Missing snapshot: ${toPosix(path.relative(root, snapshotPath))}`,
    );
    printResnapshotHelp(snapshotPath);
    process.exit(1);
  }

  const { added, removed } = diffSnapshots(edges, expected);
  if (added.length === 0 && removed.length === 0) {
    console.log(
      `[inventory-shared-module-edges] OK — ${production.length} production, ${test.length} test edges match snapshot.`,
    );
    process.exit(0);
  }

  console.error("[inventory-shared-module-edges] Snapshot drift detected.");
  if (added.length) {
    console.error(`  Added (${added.length}):`);
    for (const e of added) {
      console.error(
        `    + [${e.kind}] ${e.importer} → ${e.modulePath} {${e.importedSymbols.join(", ")}}`,
      );
    }
  }
  if (removed.length) {
    console.error(`  Removed (${removed.length}):`);
    for (const e of removed) {
      console.error(
        `    - [${e.kind}] ${e.importer} → ${e.modulePath} {${e.importedSymbols.join(", ")}}`,
      );
    }
  }
  printResnapshotHelp(snapshotPath);
  process.exit(1);
}

main();
