import { readFile } from "fs/promises";
import path from "path";
import { localeService } from "@/features/i18n/locale.service";
import { uiMessageService } from "@/features/translation/ui-message.service";
import { UiMessagesAdmin } from "@/features/translation/components/ui-messages-admin";
import { flattenMessages } from "@/features/translation/ui-messages-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEBUG_ENDPOINT = "http://127.0.0.1:7300/ingest/df4ee46a-c9a3-41ec-a748-5c05bd29eec9";
const DEBUG_SESSION_ID = "51ee47";

function debugLog(hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  const payload = {
    sessionId: DEBUG_SESSION_ID,
    runId: "ui-messages-admin-initial",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };

  // #region agent log
  try {
    console.error("[debug-51ee47]", JSON.stringify(payload));
  } catch {
    console.error("[debug-51ee47]", hypothesisId, location, message);
  }
  // #endregion

  fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": DEBUG_SESSION_ID },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

function flattenToMap(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      result[fullKey] = v;
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(result, flattenToMap(v as Record<string, unknown>, fullKey));
    }
  }
  return result;
}

export default async function UiMessagesAdminPage() {
  let locales;
  try {
    locales = await prisma.localeConfig.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    });
    // #region agent log
    debugLog("H1", "ui-messages/page.tsx:47", "Loaded locale configs", { localeCount: locales.length });
    // #endregion
  } catch (error) {
    // #region agent log
    debugLog("H1", "ui-messages/page.tsx:50", "Failed loading locale configs", {
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
    // #endregion
    throw error;
  }

  let enabledLocales;
  try {
    enabledLocales = await localeService.listEnabled();
    // #region agent log
    debugLog("H2", "ui-messages/page.tsx:62", "Loaded enabled locales", {
      enabledLocaleCount: enabledLocales.length,
    });
    // #endregion
  } catch (error) {
    // #region agent log
    debugLog("H2", "ui-messages/page.tsx:68", "Failed loading enabled locales", {
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
    // #endregion
    throw error;
  }

  const enPath = path.join(process.cwd(), "messages", "en.json");
  let enMessages: Record<string, unknown> = {};
  try {
    enMessages = JSON.parse(await readFile(enPath, "utf-8"));
  } catch {
    // #region agent log
    debugLog("H3", "ui-messages/page.tsx:83", "Failed reading en.json, using empty base messages", {
      enPath,
    });
    // #endregion
  }

  const messageKeys = flattenMessages(enMessages);
  let dbRows;
  try {
    dbRows = await uiMessageService.getAllGrouped();
    // #region agent log
    debugLog("H4", "ui-messages/page.tsx:93", "Loaded grouped DB UI messages", { rowGroupCount: dbRows.length });
    // #endregion
  } catch (error) {
    // #region agent log
    debugLog("H4", "ui-messages/page.tsx:97", "Failed loading grouped DB UI messages", {
      errorMessage: error instanceof Error ? error.message : "unknown",
    });
    // #endregion
    throw error;
  }

  const fileMessagesByLocale: Record<string, Record<string, string>> = {};
  for (const locale of enabledLocales) {
    const filePath = path.join(process.cwd(), "messages", `${locale.code}.json`);
    try {
      const content = JSON.parse(await readFile(filePath, "utf-8")) as Record<string, unknown>;
      fileMessagesByLocale[locale.code] = flattenToMap(content);
    } catch {
      fileMessagesByLocale[locale.code] = {};
      // #region agent log
      debugLog("H5", "ui-messages/page.tsx:113", "Failed reading locale message file, using empty map", {
        localeCode: locale.code,
        filePath,
      });
      // #endregion
    }
  }

  // #region agent log
  debugLog("H5", "ui-messages/page.tsx:121", "Prepared UI messages admin payload", {
    localeCount: locales.length,
    enabledLocaleCount: enabledLocales.length,
    messageKeyCount: messageKeys.length,
    dbRowGroupCount: dbRows.length,
  });
  // #endregion

  return (
    <UiMessagesAdmin
      locales={locales}
      enabledLocales={enabledLocales}
      messageKeys={messageKeys}
      dbRows={dbRows}
      fileMessagesByLocale={fileMessagesByLocale}
    />
  );
}
