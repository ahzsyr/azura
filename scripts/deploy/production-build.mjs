#!/usr/bin/env node
/**
 * Production build router: Vercel → prisma generate + next build;
 * Hostinger/other → hostinger-build.mjs (chmod, DB probe, BUILD_WITHOUT_DB).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

const root = dirname(fileURLToPath(import.meta.url));

function runNode(script, extraArgs = []) {
  const result = spawnSync(process.execPath, [join(root, script), ...extraArgs], {
    stdio: "inherit",
    env: process.env,
    cwd: process.cwd(),
  });
  return result.status ?? 1;
}

function runNpx(args) {
  const result = spawnSync("npx", args, {
    stdio: "inherit",
    shell: false,
    env: process.env,
    cwd: process.cwd(),
  });
  return result.status ?? 1;
}

if (process.env.VERCEL) {
  console.log(
    "[production-build] Vercel — prisma generate + next build (BUILD_WITHOUT_DB=1)",
  );
  const genExit = runNode("../prisma-generate.mjs");
  if (genExit !== 0) process.exit(genExit);

  const migrateExit = runNode("prisma-migrate-deploy.mjs");
  if (migrateExit !== 0) process.exit(migrateExit);

  const ciFsExit = spawnSync("npm", ["run", "ci:cloud-native-fs"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
    cwd: process.cwd(),
  }).status ?? 1;
  if (ciFsExit !== 0) process.exit(ciFsExit);

  const ciReadsExit = spawnSync("npm", ["run", "ci:cloud-native-reads"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
    cwd: process.cwd(),
  }).status ?? 1;
  if (ciReadsExit !== 0) process.exit(ciReadsExit);

  const lazyPanelPath = join(
    process.cwd(),
    "src/components/personalization/personalization-panel-lazy.tsx",
  );
  const headerDashboardPath = join(
    process.cwd(),
    "src/features/navigation/admin/HeaderDashboardApp.tsx",
  );
  const previewPanelPath = join(
    process.cwd(),
    "src/features/navigation/admin/PreviewPanel.tsx",
  );
  const megaCardPath = join(
    process.cwd(),
    "src/features/navigation/mega-menu-card-images.ts",
  );
  const hasLazyPanelFile = existsSync(lazyPanelPath);
  const hasHeaderDashboardFile = existsSync(headerDashboardPath);
  const hasPreviewPanelFile = existsSync(previewPanelPath);
  const hasMegaCardFile = existsSync(megaCardPath);
  const lazyPanelSource = hasLazyPanelFile ? readFileSync(lazyPanelPath, "utf8") : "";
  const headerDashboardSource = hasHeaderDashboardFile ? readFileSync(headerDashboardPath, "utf8") : "";
  const previewPanelSource = hasPreviewPanelFile ? readFileSync(previewPanelPath, "utf8") : "";
  const megaCardSource = hasMegaCardFile ? readFileSync(megaCardPath, "utf8") : "";
  const usesGlobalTimeout = lazyPanelSource.includes("globalThis.setTimeout");
  const usesWindowTimeout = lazyPanelSource.includes("window.setTimeout");
  const dashboardImportsPreviewPanel = headerDashboardSource.includes('import { PreviewPanel } from "./PreviewPanel";');
  const dashboardRendersPreviewPanel = headerDashboardSource.includes("<PreviewPanel localeCode=");
  const previewImportsMegaCardImages = previewPanelSource.includes('from "@/features/navigation/mega-menu-card-images"');
  const megaCardImportsCollectionsService = megaCardSource.includes('from "@/features/collections/collections-data.service"');
  const megaCardImportsProductsService = megaCardSource.includes('from "@/features/products/products-data.service"');
  const megaCardImportsPrisma = megaCardSource.includes('from "@/lib/prisma"');
  const megaCardImportsUnstableCache = megaCardSource.includes('from "next/cache"');
  console.log(
    `[production-build][debug] source_probe hasFile=${hasLazyPanelFile} globalTimeout=${usesGlobalTimeout} windowTimeout=${usesWindowTimeout} commit=${process.env.VERCEL_GIT_COMMIT_SHA ?? "n/a"}`,
  );
  const buildEnv = { ...process.env, BUILD_WITHOUT_DB: "1" };
  const buildExit = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    shell: false,
    env: buildEnv,
    cwd: process.cwd(),
  }).status ?? 1;
  process.exit(buildExit);
}

console.log("[production-build] Hostinger/local — hostinger-build.mjs");
// #region agent log
fetch('http://127.0.0.1:7865/ingest/acef085a-8163-4db6-8e09-8d71963925d4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'21593e'},body:JSON.stringify({sessionId:'21593e',runId:'pre-fix',hypothesisId:'H4',location:'scripts/deploy/production-build.mjs:105',message:'about to run hostinger-build',data:{vercel:Boolean(process.env.VERCEL),cwd:process.cwd()},timestamp:Date.now()})}).catch(()=>{});
// #endregion
process.exit(runNode("hostinger-build.mjs"));
