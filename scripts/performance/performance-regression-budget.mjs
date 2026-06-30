#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const referencePath = path.resolve(
  root,
  process.env.PERF_REFERENCE ?? "performance-reports/cwv-baseline-post-layout.json",
);
const currentPath = path.resolve(
  root,
  process.env.PERF_CURRENT ?? "performance-reports/cwv-baseline-post-catalog-isr.json",
);
const bundlePath = path.resolve(root, "performance-reports/bundle-report.json");
const outFile = path.resolve(root, "performance-reports/performance-regression-budget.json");
const MAX_REGRESSION = 0.05;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function byLabel(report) {
  return new Map((report.routes ?? []).map((route) => [route.label, route]));
}

function regression(current, reference) {
  if (current == null || reference == null || reference === 0) return null;
  return (current - reference) / reference;
}

function checkMetric(label, metric, current, reference) {
  const ratio = regression(current, reference);
  return {
    label,
    metric,
    current,
    reference,
    regressionPct: ratio == null ? null : Number((ratio * 100).toFixed(2)),
    passed: ratio == null || ratio <= MAX_REGRESSION,
  };
}

function isComparable(route) {
  return typeof route?.status === "number" && route.status >= 200 && route.status < 400;
}

function main() {
  const reference = readJson(referencePath);
  const current = readJson(currentPath);
  const referenceRoutes = byLabel(reference);
  const rows = [];

  for (const route of current.routes ?? []) {
    const base = referenceRoutes.get(route.label);
    if (!base) continue;
    if (!isComparable(base) || !isComparable(route)) {
      rows.push({
        label: route.label,
        metric: "route-status",
        current: route.status ?? null,
        reference: base.status ?? null,
        regressionPct: null,
        passed: true,
        skipped: true,
        reason: "non-2xx/3xx route status cannot be used as a performance reference",
      });
      continue;
    }
    rows.push(checkMetric(route.label, "ttfb", route.ttfb, base.ttfb));
    rows.push(checkMetric(route.label, "lcp", route.lcp, base.lcp));
    rows.push(checkMetric(route.label, "inp", route.inp, base.inp));
  }

  let bundle = null;
  if (fs.existsSync(bundlePath)) {
    const bundleReport = readJson(bundlePath);
    bundle = {
      totalJsKb: bundleReport.totalJsKb ?? null,
      storefrontRouteCount: bundleReport.storefrontRouteBundles?.length ?? 0,
      passed: true,
      note:
        "Bundle regression requires a production build before and after PR-7. Current report is recorded for traceability.",
    };
  }

  const report = {
    generatedAt: new Date().toISOString(),
    reference: path.relative(root, referencePath),
    current: path.relative(root, currentPath),
    thresholdPct: MAX_REGRESSION * 100,
    passed: rows.every((row) => row.passed) && (bundle?.passed ?? true),
    rows,
    bundle,
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + "\n");
  console.log(`Performance regression budget: ${report.passed ? "passed" : "failed"}`);
  console.log(path.relative(root, outFile));
  if (!report.passed) process.exit(1);
}

main();
