#!/usr/bin/env node
/**
 * Print slow-route summary from an exported metrics JSON file.
 * Usage: npm run perf:routes -- path/to/azura-perf-export.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const input =
  process.argv[2] ??
  path.join(root, "performance-reports", "latest-metrics-export.json");

function main() {
  if (!fs.existsSync(input)) {
    console.error(`Metrics file not found: ${input}`);
    console.error("Export JSON from Admin → Performance or the dev Perf panel.");
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(input, "utf8"));
  const snapshot = payload.snapshot ?? payload;
  const outFile = path.join(root, "performance-reports", "slow-routes-report.json");

  const report = {
    generatedAt: new Date().toISOString(),
    source: path.relative(root, input),
    avgRouteTransitionMs: snapshot.avgRouteTransitionMs,
    p95RouteTransitionMs: snapshot.p95RouteTransitionMs,
    slowRoutes: snapshot.slowRoutes ?? [],
    recentTransitions: (snapshot.routeTransitions ?? []).slice(0, 30),
    failures: snapshot.routeFailures ?? [],
    vitals: {
      lcp: snapshot.lcp,
      cls: snapshot.cls,
      inp: snapshot.inp,
      hydrationMs: snapshot.hydrationMs,
    },
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log("Slow routes report:", path.relative(root, outFile));
  if (report.slowRoutes.length === 0) {
    console.log("No routes averaged ≥ 400 ms.");
  } else {
    for (const row of report.slowRoutes) {
      console.log(`  ${row.avgMs} ms avg (${row.count}x)  ${row.path}`);
    }
  }

  if (report.failures.length > 0) {
    console.log("\nFailures:");
    for (const fail of report.failures.slice(0, 5)) {
      console.log(`  [${fail.kind}] ${fail.pathname}: ${fail.message}`);
    }
  }
}

main();
