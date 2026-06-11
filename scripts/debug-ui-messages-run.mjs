/**
 * One-off debug runner for /admin/ui-messages data loading (session 51ee47).
 * Usage: node scripts/debug-ui-messages-run.mjs
 */
import { readFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LOG_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "debug-51ee47.log");
const SESSION_ID = "51ee47";

async function debugLog(hypothesisId, location, message, data = {}) {
  const line = JSON.stringify({
    sessionId: SESSION_ID,
    runId: "local-script",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  });
  console.log(line);
  await appendFile(LOG_PATH, line + "\n");
}

function flattenToMap(obj, prefix = "") {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") result[fullKey] = v;
    else if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(result, flattenToMap(v, fullKey));
    }
  }
  return result;
}

function flattenMessages(obj, prefix = "", namespace = "root") {
  const result = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      result.push({ namespace, key: fullKey, fullKey, englishValue: v });
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      result.push(...flattenMessages(v, fullKey, namespace));
    }
  }
  return result;
}

async function step(name, hypothesisId, fn) {
  try {
    const result = await fn();
    await debugLog(hypothesisId, `debug-ui-messages-run.mjs:${name}`, `${name} ok`, {
      ...(typeof result === "object" && result !== null ? result : { result }),
    });
    return result;
  } catch (error) {
    await debugLog(hypothesisId, `debug-ui-messages-run.mjs:${name}`, `${name} failed`, {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : "unknown",
    });
    throw error;
  }
}

async function main() {
  const { prisma } = await import("../src/lib/prisma.ts");
  const { localeService } = await import("../src/features/i18n/locale.service.ts");
  const { uiMessageService } = await import("../src/features/translation/ui-message.service.ts");

  const locales = await step("localeConfig.findMany", "H1", async () => {
    const rows = await prisma.localeConfig.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    });
    return { localeCount: rows.length };
  });

  const enabledLocales = await step("localeService.listEnabled", "H2", async () => {
    const rows = await localeService.listEnabled();
    return { enabledLocaleCount: rows.length, codes: rows.map((r) => r.code) };
  });

  const enPath = path.join(process.cwd(), "messages", "en.json");
  let enMessages = {};
  try {
    enMessages = JSON.parse(await readFile(enPath, "utf-8"));
    await debugLog("H3", "debug-ui-messages-run.mjs:en.json", "en.json loaded", {
      keyCount: Object.keys(enMessages).length,
    });
  } catch (error) {
    await debugLog("H3", "debug-ui-messages-run.mjs:en.json", "en.json failed", {
      enPath,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }

  const messageKeys = flattenMessages(enMessages);
  await debugLog("H3", "debug-ui-messages-run.mjs:flatten", "flattenMessages ok", {
    messageKeyCount: messageKeys.length,
  });

  await step("uiMessageService.getAllGrouped", "H4", async () => {
    const dbRows = await uiMessageService.getAllGrouped();
    return { rowGroupCount: dbRows.length };
  });

  const enabled = await localeService.listEnabled();
  for (const locale of enabled) {
    const filePath = path.join(process.cwd(), "messages", `${locale.code}.json`);
    try {
      const content = JSON.parse(await readFile(filePath, "utf-8"));
      flattenToMap(content);
      await debugLog("H5", "debug-ui-messages-run.mjs:localeFile", "locale file ok", {
        localeCode: locale.code,
      });
    } catch (error) {
      await debugLog("H5", "debug-ui-messages-run.mjs:localeFile", "locale file failed", {
        localeCode: locale.code,
        filePath,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await debugLog("H5", "debug-ui-messages-run.mjs:done", "All steps completed", {
    localeCount: locales.localeCount,
  });

  await prisma.$disconnect();
}

main().catch(async (error) => {
  await debugLog("H0", "debug-ui-messages-run.mjs:fatal", "Script aborted", {
    errorMessage: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
