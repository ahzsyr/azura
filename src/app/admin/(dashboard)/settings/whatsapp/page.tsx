import { readFile } from "fs/promises";
import path from "path";
import { WhatsAppAdminClient } from "@/features/whatsapp/whatsapp-admin-client";
import { getCompanyInfo } from "@/lib/data";
import { localeService } from "@/features/i18n/locale.service";
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

async function loadMessagesFile(code: string): Promise<Record<string, unknown>> {
  try {
    const filePath = path.join(process.cwd(), "messages", `${code}.json`);
    return JSON.parse(await readFile(filePath, "utf-8")) as Record<string, unknown>;
  } catch {
    try {
      const enPath = path.join(process.cwd(), "messages", "en.json");
      return JSON.parse(await readFile(enPath, "utf-8")) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

export default async function WhatsAppSettingsPage() {
  try {
    const [company, enabledLocales] = await Promise.all([
      getCompanyInfo(),
      localeService.listEnabled(),
    ]);

    const messageValues: Record<string, Record<string, string>> = {};
    for (const key of MESSAGE_KEYS) {
      messageValues[key] = {};
    }

    for (const locale of enabledLocales) {
      const messages = await loadMessagesFile(locale.code);
      const whatsappMessages = (messages.whatsapp ?? {}) as Record<string, unknown>;
      for (const key of MESSAGE_KEYS) {
        messageValues[key][locale.code] = getNestedValue(whatsappMessages, key);
      }
    }

    const enMessages = await loadMessagesFile("en");
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
