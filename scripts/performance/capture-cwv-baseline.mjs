#!/usr/bin/env node
/**
 * Capture a route-level CWV baseline from a running production build.
 *
 * Usage:
 *   PERF_BASE_URL=http://localhost:3000 npm run perf:cwv
 *   PERF_OUTPUT=performance-reports/cwv-baseline-post-middleware.json npm run perf:cwv
 *   PERF_PDP_PATH=/en/products/my-product PERF_COLLECTION_PATH=/en/collections/my-collection npm run perf:cwv
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = (process.env.PERF_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const outFile = path.resolve(
  root,
  process.env.PERF_OUTPUT ?? "performance-reports/cwv-baseline.json",
);

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    console.error(
      "Playwright is required for CWV capture. Install it with `npm install -D playwright` " +
        "or run this script in an environment where Playwright is available.",
    );
    process.exit(1);
  }
}

function routePlan() {
  const locale = process.env.PERF_LOCALE ?? "en";
  return [
    { label: "home", path: process.env.PERF_HOME_PATH ?? `/${locale}` },
    { label: "products", path: process.env.PERF_PRODUCTS_PATH ?? `/${locale}/products` },
    {
      label: "pdp",
      path: process.env.PERF_PDP_PATH ?? `/${locale}/products/alfa-2-4-5ghz-indoor-antenna`,
    },
    {
      label: "collection",
      path: process.env.PERF_COLLECTION_PATH ?? `/${locale}/collections/networking`,
    },
  ];
}

async function readSnapshot(page) {
  return page.evaluate(() => {
    const snapshot = window.__AZ_RUNTIME_METRICS__ ?? null;
    const nav = performance.getEntriesByType("navigation")[0];
    return {
      snapshot,
      navigation: nav
        ? {
            ttfb: Math.round(nav.responseStart - nav.startTime),
            domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
            load: Math.round(nav.loadEventEnd - nav.startTime),
          }
        : null,
    };
  });
}

async function waitForMetrics(page) {
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
  await page.waitForTimeout(3_000);
  return readSnapshot(page);
}

async function captureRoute(browser, route) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  const url = `${baseUrl}${route.path}`;
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const metrics = await waitForMetrics(page);
  await page.close();

  const snapshot = metrics.snapshot;
  return {
    label: route.label,
    path: route.path,
    url,
    status: response?.status() ?? null,
    capturedAt: new Date().toISOString(),
    ttfb: snapshot?.ttfb ?? metrics.navigation?.ttfb ?? null,
    fcp: snapshot?.fcp ?? null,
    lcp: snapshot?.lcp ?? null,
    cls: snapshot?.cls ?? null,
    inp: snapshot?.inp ?? null,
    hydrationMs: snapshot?.hydrationMs ?? metrics.navigation?.domContentLoaded ?? null,
    routeTransitionMs: null,
    raw: snapshot,
  };
}

async function main() {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const routes = routePlan();
  const results = [];

  try {
    for (const route of routes) {
      console.log(`[cwv] capturing ${route.label}: ${route.path}`);
      results.push(await captureRoute(browser, route));
    }
  } finally {
    await browser.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    routes: results,
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + "\n");
  console.log(`[cwv] wrote ${path.relative(root, outFile)}`);
}

main().catch((error) => {
  console.error("[cwv] capture failed:", error);
  process.exit(1);
});
