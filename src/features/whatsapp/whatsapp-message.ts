import { getWhatsappDefaultMessage } from "@/config/site";
import type {
  WhatsAppMessageTemplateKey,
  WhatsAppSettings,
} from "@/features/whatsapp/whatsapp.schema";

export function formatWhatsAppMessage(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

export function resolveWhatsAppPhone(companyWhatsapp?: string | null): string {
  return (
    companyWhatsapp?.trim() ||
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() ||
    ""
  );
}

/** Resolve message template with env fallback for migration. */
export function resolveWhatsAppMessageTemplate(
  translatedTemplate: string | undefined,
  vars: Record<string, string>,
  brandName?: string,
): string {
  const template = translatedTemplate?.trim();
  if (template) {
    return formatWhatsAppMessage(template, vars);
  }
  return getWhatsappDefaultMessage(brandName);
}

export function resolveWhatsAppTemplateOverride(
  settings: WhatsAppSettings,
  key: WhatsAppMessageTemplateKey,
  locale: string,
  fallback: string,
  vars: Record<string, string> = {},
): string {
  const normalizedLocale = locale.trim().toLowerCase();
  const languagePrefix = normalizedLocale.split("-")[0];
  const customTemplate =
    settings.messages[key][locale] ??
    settings.messages[key][normalizedLocale] ??
    settings.messages[key][languagePrefix];

  const template = customTemplate?.trim();
  if (!template) return fallback;
  return formatWhatsAppMessage(template, vars);
}
