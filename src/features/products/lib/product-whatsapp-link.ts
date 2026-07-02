import { getWhatsAppUrl } from "@/lib/utils";

export type ProductLinkContext = {
  productTitle: string;
  productSlug?: string;
  productSku?: string;
};

export const DEFAULT_WHATSAPP_MESSAGE_TEMPLATE =
  "Hi, I would like to get in touch with you about {productTitle}";

export function interpolateProductMessage(template: string, ctx: ProductLinkContext): string {
  return template
    .replace(/\{productTitle\}/g, ctx.productTitle)
    .replace(/\{productSlug\}/g, ctx.productSlug ?? "")
    .replace(/\{productSku\}/g, ctx.productSku ?? "");
}

export function buildWhatsAppProductUrl(
  phone: string,
  messageTemplate: string,
  ctx: ProductLinkContext,
): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const message = interpolateProductMessage(messageTemplate.trim() || "Hi", ctx);
  return getWhatsAppUrl(digits, message);
}

/** Parse wa.me URL into phone + message template for migration from external link type. */
export function productLinkContextFromProduct(product: {
  productTitle?: string;
  name?: string;
  title?: string;
  slug?: string;
  mpn?: string;
  manufacturer_part_number?: string;
}): ProductLinkContext {
  return {
    productTitle: product.productTitle || product.name || product.title || "",
    productSlug: product.slug,
    productSku: product.mpn || product.manufacturer_part_number,
  };
}

export function parseWhatsAppExternalUrl(url: string): { phone: string; message: string } | null {
  const t = url.trim();
  if (!t) return null;
  try {
    const u = new URL(t.startsWith("http") ? t : `https://${t}`);
    if (!/wa\.me$/i.test(u.hostname) && u.hostname !== "api.whatsapp.com") return null;
    const phoneMatch = u.pathname.match(/^\/(\d+)/);
    if (!phoneMatch) return null;
    const text = u.searchParams.get("text") ?? "";
    return { phone: phoneMatch[1], message: text || DEFAULT_WHATSAPP_MESSAGE_TEMPLATE };
  } catch {
    return null;
  }
}
