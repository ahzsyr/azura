import { getWhatsappDefaultMessage } from "@/config/site";

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
