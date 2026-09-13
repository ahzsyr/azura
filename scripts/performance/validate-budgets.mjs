#!/usr/bin/env node
/**
 * Validate bundle + optional metrics exports against performance budgets.
 * Usage: npm run perf:validate
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const BUDGETS = {
  totalJsKb: { good: 4500, poor: 6500 },
  largestChunkKb: { good: 280, poor: 420 },
  lcp: { good: 2500, poor: 4000 },
  cls: { good: 0.1, poor: 0.25 },
  inp: { good: 200, poor: 500 },
  avgRouteTransitionMs: { good: 400, poor: 1200 },
};

function rate(value, budget) {
  if (value == null) return "unknown";
  if (value <= budget.good) return "good";
  if (value <= budget.poor) return "warn";
  return "fail";
}

function main() {
  const bundlePath = path.join(root, "performance-reports", "bundle-report.json");
  const metricsPath = path.join(root, "performance-reports", "latest-metrics-export.json");

  const failures = [];
  const rows = [];

  if (fs.existsSync(bundlePath)) {
    const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
    const largest = bundle.topChunks?.[0]?.kb ?? null;
    rows.push({
      metric: "Total JS",
      value: bundle.totalJsKb,
      rating: rate(bundle.totalJsKb, BUDGETS.totalJsKb),
    });
    rows.push({
      metric: "Largest chunk",
      value: largest,
      rating: rate(largest, BUDGETS.largestChunkKb),
    });
    for (const row of rows) {
      if (row.rating === "fail") failures.push(row.metric);
    }
  } else {
    console.warn("No bundle-report.json — run npm run perf:bundle after build.");
  }

  if (fs.existsSync(metricsPath)) {
    const { snapshot } = JSON.parse(fs.readFileSync(metricsPath, "utf8"));
    const vitals = [
      ["LCP", snapshot.lcp, BUDGETS.lcp],
      ["CLS", snapshot.cls, BUDGETS.cls],
      ["INP", snapshot.inp, BUDGETS.inp],
      [
        "Avg route transition",
        snapshot.avgRouteTransitionMs,
        BUDGETS.avgRouteTransitionMs,
      ],
    ];
    for (const [metric, value, budget] of vitals) {
      const rating = rate(value, budget);
      rows.push({ metric, value, rating });
      if (rating === "fail") failures.push(metric);
    }
  } else {
    console.warn("No latest-metrics-export.json — export from Performance dashboard.");
  }

  const outFile = path.join(root, "performance-reports", "validation-report.json");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(
    outFile,
    JSON.stringify({ generatedAt: new Date().toISOString(), rows, failures }, null, 2),
  );

  console.log("Validation report:", path.relative(root, outFile));
  for (const row of rows) {
    console.log(`  [${row.rating}] ${row.metric}: ${row.value ?? "—"}`);
  }

  if (failures.length > 0) {
    console.error(`\nBudget failures: ${failures.join(", ")}`);
    process.exit(1);
  }

  console.log("\nAll checked budgets within limits.");
}

main();
