/**
 * AZURA template — site defaults and env-driven overrides.
 * Product name (AZURA) vs client brand (NEXT_PUBLIC_SITE_NAME / CompanyInfo / theme).
 */

export const SITE_PRODUCT_NAME = "AZURA";

export const DEFAULT_BRAND_NAME = "AZURA";
export const DEFAULT_BRAND_SHORT = "AZ";
export const DEFAULT_TAGLINE = "Solutions";

function env(key: string, fallback: string): string {
  const v = process.env[key]?.trim();
  return v || fallback;
}

export function getPublicBrandName(): string {
  return env("NEXT_PUBLIC_SITE_NAME", DEFAULT_BRAND_NAME);
}

export function getPublicBrandShort(): string {
  return env("NEXT_PUBLIC_SITE_SHORT_NAME", DEFAULT_BRAND_SHORT);
}

export function getPublicTagline(): string {
  return env("NEXT_PUBLIC_SITE_TAGLINE", DEFAULT_TAGLINE);
}

export function getSiteUrl(): string {
  return env("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
}

export function getSiteDomain(): string {
  try {
    return new URL(getSiteUrl()).hostname;
  } catch {
    return "localhost";
  }
}

export function getSeedAdminEmail(): string {
  return env("SEED_ADMIN_EMAIL", "admin@localhost");
}

export function getSeedAdminPassword(): string {
  return env("SEED_ADMIN_PASSWORD", "admin123");
}

export function getSeedCompanyEmail(): string {
  return env("SEED_COMPANY_EMAIL", "info@localhost");
}

export function getWhatsappDefaultMessage(brandName?: string): string {
  const brand = brandName?.trim() || getPublicBrandName();
  const template = env(
    "NEXT_PUBLIC_WHATSAPP_MESSAGE",
    "Assalamu Alaikum, I would like to get in touch with {brandName}."
  );
  return template.replace(/\{brandName\}/g, brand);
}

/** True when branding still matches template factory defaults (for migrations). */
export function isDefaultBrandName(name: string | undefined | null): boolean {
  const n = name?.trim();
  if (!n) return true;
  return n === DEFAULT_BRAND_NAME || n === "SAFEER MEDINA";
}
