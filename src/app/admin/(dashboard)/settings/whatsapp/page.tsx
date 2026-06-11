import { readFile } from "fs/promises";
import path from "path";
import { WhatsAppAdminClient } from "@/features/whatsapp/whatsapp-admin-client";
import { getCompanyInfo } from "@/lib/data";
import { localeService } from "@/features/i18n/locale.service";
import { uiMessageService } from "@/features/translation/ui-message.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "WhatsApp Settings",
};

const MESSAGE_KEYS = [
  "message.default",
  "message.contact",
  "message.contentInquiry",
  "fab.ariaLabel",
] as const;

function getNestedValue(obj: Record<string, unknown>, dotPath: string): string {
  const parts = dotPath.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : "";
}

export default async function WhatsAppSettingsPage() {
  try {
    const [company, enabledLocales, dbRows] = await Promise.all([
      getCompanyInfo(),
      localeService.listEnabled(),
      uiMessageService.getAllGrouped(),
    ]);

    const whatsappRows = dbRows.filter((row) => row.namespace === "whatsapp");

    const messageValues: Record<string, Record<string, string>> = {};
    for (const key of MESSAGE_KEYS) {
      messageValues[key] = {};
      for (const locale of enabledLocales) {
        const row = whatsappRows.find((r) => r.key === key);
        messageValues[key][locale.code] = row?.values[locale.code]?.value ?? "";
      }
    }

    const enPath = path.join(process.cwd(), "messages", "en.json");
    let enMessages: Record<string, unknown> = {};
    try {
      enMessages = JSON.parse(await readFile(enPath, "utf-8")) as Record<string, unknown>;
    } catch {
      /* empty */
    }

    const whatsappMessages = (enMessages.whatsapp ?? {}) as Record<string, unknown>;
    const fileFallbacks: Record<string, string> = {};
    for (const key of MESSAGE_KEYS) {
      fileFallbacks[key] = getNestedValue(whatsappMessages, key);
    }

    const resolvedPhone =
      company?.whatsapp?.trim() ||
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() ||
      "";

    return (
      <WhatsAppAdminClient
        resolvedPhone={resolvedPhone}
        enabledLocales={enabledLocales}
        messageValues={messageValues}
        fileFallbacks={fileFallbacks}
      />
    );
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[admin/settings/whatsapp] load failed:", errMsg);
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>WhatsApp settings unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Could not load WhatsApp settings. Check DATABASE_URL in your deployment settings, confirm
          Supabase is active, then try again.
        </CardContent>
      </Card>
    );
  }
}
