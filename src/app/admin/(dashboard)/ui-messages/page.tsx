import { Suspense } from "react";
import { readFile } from "fs/promises";
import path from "path";
import { localeService } from "@/features/i18n/locale.service";
import { uiMessageService } from "@/features/translation/ui-message.service";
import { UiMessagesAdmin } from "@/features/translation/components/ui-messages-admin";
import { flattenMessages } from "@/features/translation/ui-messages-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "UI Messages",
};

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
  const locales = await prisma.localeConfig.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
  const enabledLocales = await localeService.listEnabled();

  const enPath = path.join(process.cwd(), "messages", "en.json");
  let enMessages: Record<string, unknown> = {};
  try {
    enMessages = JSON.parse(await readFile(enPath, "utf-8"));
  } catch {
    enMessages = {};
  }

  const messageKeys = flattenMessages(enMessages);
  const dbRows = await uiMessageService.getAllGrouped();

  const fileMessagesByLocale: Record<string, Record<string, string>> = {};
  for (const locale of enabledLocales) {
    const filePath = path.join(process.cwd(), "messages", `${locale.code}.json`);
    try {
      const content = JSON.parse(await readFile(filePath, "utf-8")) as Record<string, unknown>;
      fileMessagesByLocale[locale.code] = flattenToMap(content);
    } catch {
      fileMessagesByLocale[locale.code] = {};
    }
  }

  return (
    <Suspense fallback={<div className="text-muted-foreground p-6 text-sm">Loading UI messages…</div>}>
      <UiMessagesAdmin
        locales={locales}
        enabledLocales={enabledLocales}
        messageKeys={messageKeys}
        dbRows={dbRows}
        fileMessagesByLocale={fileMessagesByLocale}
      />
    </Suspense>
  );
}
