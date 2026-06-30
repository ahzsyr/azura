#!/usr/bin/env node
/**
 * Generate the edge-safe middleware manifest consumed by src/middleware.ts.
 * Middleware must not poll APIs or DB for version checks; this file is refreshed
 * at build/deploy time and optionally by admin publish workflows that can write it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outFile = path.join(root, "src", "generated", "middleware-manifest.json");

function parseBooleanEnv(name) {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

function fallbackManifest(partial = {}) {
  const setupEnv = parseBooleanEnv("SETUP_COMPLETE");
  const comingSoonEnv = parseBooleanEnv("COMING_SOON_ENABLED");
  const registrationEnv = parseBooleanEnv("NEXT_PUBLIC_REGISTRATION_ENABLED");

  return {
    generated: true,
    manifestVersion: Date.now(),
    buildTimestamp: new Date().toISOString(),
    setup:
      setupEnv === null && comingSoonEnv === null && registrationEnv === null
        ? null
        : {
            setupComplete: setupEnv ?? false,
            registrationEnabled: registrationEnv ?? true,
            comingSoonEnabled: comingSoonEnv ?? false,
          },
    locales: {
      locales: ["en"],
      defaultLocale: "en",
    },
    redirects: {},
    ...partial,
  };
}

function normalizeRedirectType(type) {
  return type === "TEMPORARY" ? "TEMPORARY" : "PERMANENT";
}

async function main() {
  let prisma = null;
  let manifest = fallbackManifest();

  try {
    prisma = new PrismaClient();

    const [systemSettings, localeRows, redirectRows] = await Promise.all([
      prisma.jsonStore
        .findUnique({
          where: { namespace_key: { namespace: "settings", key: "system" } },
        })
        .catch(() => null),
      prisma.localeConfig
        .findMany({
          where: { isEnabled: true },
          orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        })
        .catch(() => []),
      prisma.seoRedirect
        .findMany({
          where: { isActive: true },
          orderBy: { fromPath: "asc" },
        })
        .catch(() => []),
    ]);

    const settings =
      typeof systemSettings?.data === "object" && systemSettings.data !== null
        ? systemSettings.data
        : {};
    const setupEnv = parseBooleanEnv("SETUP_COMPLETE");
    const comingSoonEnv = parseBooleanEnv("COMING_SOON_ENABLED");
    const registrationEnv = parseBooleanEnv("NEXT_PUBLIC_REGISTRATION_ENABLED");
    const locales = localeRows
      .map((row) => row.urlPrefix)
      .filter((prefix) => typeof prefix === "string" && prefix.length > 0);
    const defaultLocale =
      localeRows.find((row) => row.isDefault)?.urlPrefix ?? locales[0] ?? "en";

    manifest = fallbackManifest({
      setup: {
        setupComplete:
          setupEnv ?? (typeof settings.setupComplete === "boolean" ? settings.setupComplete : false),
        registrationEnabled:
          registrationEnv ??
          (typeof settings.registrationEnabled === "boolean"
            ? settings.registrationEnabled
            : true),
        comingSoonEnabled:
          comingSoonEnv ??
          (typeof settings.comingSoonEnabled === "boolean"
            ? settings.comingSoonEnabled
            : false),
      },
      locales: {
        locales: locales.length > 0 ? locales : ["en"],
        defaultLocale,
      },
      redirects: Object.fromEntries(
        redirectRows.map((row) => [
          row.fromPath,
          {
            toPath: row.toPath,
            type: normalizeRedirectType(row.type),
          },
        ]),
      ),
    });
  } catch (error) {
    console.warn("[middleware-manifest] DB-backed generation failed; writing fallback manifest.");
    console.warn(error instanceof Error ? error.message : error);
  } finally {
    if (prisma) await prisma.$disconnect().catch(() => undefined);
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `[middleware-manifest] wrote ${path.relative(root, outFile)} ` +
      `(version ${manifest.manifestVersion})`,
  );
}

main().catch((error) => {
  console.error("[middleware-manifest] unexpected failure:", error);
  process.exit(1);
});
